<script>
  import { getJSON, putJSON } from "../lib/api.js";
  import {
    schema, mtimes, editTarget, result, setStatus, refreshGraph, newNode,
  } from "../lib/stores.js";
  import PropPicker from "./PropPicker.svelte";
  import ResultPanel from "./ResultPanel.svelte";

  // 폼 상태 (vanilla loadIntoEditor의 DOM 값을 컴포넌트 로컬 상태로 승격)
  let id = "";
  let type = "";
  let prefLabel = "";
  let altLabel = "";
  let definition = "";
  let promptText = "";
  let tokenEstimate = "";
  let salience = "";
  let maturity = "";
  let objectValues = {}; // {propId: [id 참조]}
  let isNew = true;
  let showAllRel = false;
  let saving = false;
  let snapshot = null; // undo용 로드 시점 스냅샷
  let loadedNonce = -1;

  // editTarget nonce 변화 → 로드(같은 id·null 재선택도 트리거)
  $: if ($editTarget.nonce !== loadedNonce) {
    loadedNonce = $editTarget.nonce;
    load($editTarget.id);
  }

  function populate(node) {
    const d = node.dataProps || {};
    const o = node.objectProps || {};
    id = node.id || "";
    type = node.type || "";
    prefLabel = (d["skos:prefLabel"] || [""])[0] || "";
    altLabel = (d["skos:altLabel"] || []).join(", ");
    definition = (d["skos:definition"] || [""])[0] || "";
    promptText = (d["ho:promptText"] || [""])[0] || "";
    tokenEstimate = (d["ho:tokenEstimate"] || [""])[0] ?? "";
    salience = (d["ho:salience"] || [""])[0] ?? "";
    maturity = (d["ho:maturity"] || [""])[0] || "";
    const ov = {};
    for (const p of $schema.objectProperties) ov[p.id] = (o[p.id] || []).slice();
    objectValues = ov;
  }

  async function load(nodeId) {
    if (nodeId) {
      isNew = false;
      try {
        const node = await getJSON("/api/node/" + encodeURIComponent(nodeId));
        populate(node);
      } catch (e) {
        result.set({ error: e.message });
        return;
      }
    } else {
      isNew = true;
      populate({ id: "", type: "", objectProps: {}, dataProps: {} });
    }
    snapshot = capture();
  }

  function capture() {
    return JSON.stringify({
      id, type, prefLabel, altLabel, definition, promptText,
      tokenEstimate, salience, maturity, objectValues,
    });
  }

  // undo: 로드(또는 마지막 저장) 시점으로 편집 되돌림
  function undo() {
    if (!snapshot) return;
    const s = JSON.parse(snapshot);
    ({ id, type, prefLabel, altLabel, definition, promptText,
       tokenEstimate, salience, maturity } = s);
    objectValues = s.objectValues || {};
  }

  // 관계 슬롯 노출: domain이 없거나 현재 타입과 맞거나 값이 있으면(짧게 유지)
  function relevant(p) {
    return (
      !p.domain ||
      p.domain === type ||
      (objectValues[p.id] && objectValues[p.id].length)
    );
  }
  $: visibleProps = ($schema ? $schema.objectProperties : []).filter(
    (p) => showAllRel || relevant(p)
  );

  function setProp(pid, v) {
    objectValues[pid] = v;
    objectValues = objectValues; // 반응성 트리거
  }

  async function save() {
    if (!id.trim() || !type) {
      result.set({ error: "id 와 타입(class)은 필수입니다." });
      return;
    }
    if (!prefLabel.trim()) {
      result.set({ error: "prefLabel 은 필수입니다 (유일해야 함)." });
      return;
    }
    let nid = id.trim();
    if (!nid.startsWith("id:")) nid = "id:" + nid;
    const node = { id: nid, type };
    node["skos:prefLabel"] = prefLabel.trim();
    const alt = altLabel.split(",").map((s) => s.trim()).filter(Boolean);
    if (alt.length) node["skos:altLabel"] = alt;
    if (definition.trim()) node["skos:definition"] = definition.trim();
    for (const p of $schema.objectProperties) {
      const v = (objectValues[p.id] || []).filter(Boolean);
      if (v.length) node[p.id] = v;
    }
    if (promptText.trim()) node["ho:promptText"] = promptText.trim();
    if (String(tokenEstimate).trim() !== "") node["ho:tokenEstimate"] = Number(tokenEstimate);
    if (String(salience).trim() !== "") node["ho:salience"] = Number(salience);
    if (maturity) node["ho:maturity"] = maturity;
    // Predicates this editor is authoritative over. The writer MERGES: a managed
    // predicate omitted from the payload is a deletion (the user cleared it),
    // while any predicate NOT listed here (e.g. a literal this form doesn't
    // surface) is preserved from disk. Without this list, clearing an object-
    // property slot could never delete it (absence would mean "keep").
    node._managed = [
      "skos:prefLabel", "skos:altLabel", "skos:definition",
      "ho:promptText", "ho:tokenEstimate", "ho:salience", "ho:maturity",
      ...$schema.objectProperties.map((p) => p.id),
    ];
    if ($mtimes) node._mtimes = $mtimes;

    saving = true;
    setStatus("저장 중…");
    let res;
    try {
      res = await putJSON("/api/node", node);
    } catch (e) {
      saving = false;
      if (e.status === 409) {
        result.set({
          error: "충돌: 다른 곳에서 파일이 변경되었습니다. 노드를 다시 열어(재로드) 편집한 뒤 저장하세요.",
        });
        setStatus("충돌 · 재로드 필요", "bad");
      } else {
        result.set({ error: e.message });
        setStatus("오류", "bad");
      }
      return;
    }
    saving = false;
    if (res.mtimes) mtimes.set(res.mtimes);
    result.set(res);
    if (res.saved) {
      isNew = false;
      snapshot = capture();
      setStatus("저장됨 · validate PASS", "ok");
      await refreshGraph();
    } else {
      setStatus("저장 안 됨 · validate FAIL (되돌림)", "bad");
    }
  }
</script>

<div class="pane-head">
  <h2>편집기</h2>
  <span class="hint">{isNew ? "새 노드" : "편집 중"}</span>
</div>

<div class="editor-scroll" style="flex:1">
  <form autocomplete="off" on:submit|preventDefault={save}>
    <div class="cap">id (예: id:h-my-agent)</div>
    <input bind:value={id} disabled={!isNew} placeholder="id:..." />

    <div class="cap">타입 (class) <span class="req">*</span></div>
    <select bind:value={type}>
      <option value="">— 선택 —</option>
      {#each $schema.classes as c (c.id)}
        <option value={c.id}>{c.label} ({c.id})</option>
      {/each}
    </select>

    <div class="cap">prefLabel <span class="req">*</span></div>
    <input bind:value={prefLabel} placeholder="클래스 내 유일한 라벨" />

    <div class="cap">altLabel (쉼표로 여러 개)</div>
    <input bind:value={altLabel} />

    <div class="cap">definition</div>
    <textarea rows="2" bind:value={definition}></textarea>

    <div class="cap">관계 (object properties — range 구속 picker)</div>
    {#each visibleProps as p (p.id)}
      <PropPicker
        prop={p}
        value={objectValues[p.id] || []}
        onChange={(v) => setProp(p.id, v)}
      />
    {/each}
    <label class="rel-toggle">
      <input type="checkbox" style="width:auto" bind:checked={showAllRel} /> 모든 관계 슬롯 표시
    </label>

    <div class="cap">promptText</div>
    <textarea rows="3" bind:value={promptText}></textarea>

    <div class="cap">tokenEstimate</div>
    <input type="number" bind:value={tokenEstimate} />

    <div class="cap">salience (0..1)</div>
    <input type="number" step="0.05" bind:value={salience} />

    <div class="cap">maturity</div>
    <select bind:value={maturity}>
      {#each ["", "draft", "reviewed", "stable", "deprecated"] as m}
        <option value={m}>{m || "—"}</option>
      {/each}
    </select>

    <div class="editor-actions">
      <button type="submit" class="primary" disabled={saving}>
        {isNew ? "생성 + validate" : "저장 + validate"}
      </button>
      <button type="button" on:click={undo} title="로드 시점으로 되돌림">되돌리기</button>
      <button type="button" on:click={newNode}>새로(비움)</button>
    </div>
  </form>

  <ResultPanel />
</div>
