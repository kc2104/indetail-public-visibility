const $ = (id) => document.getElementById(id);
let allRows = [];

function dateLabel(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-IN", {day:"2-digit", month:"short", year:"numeric"});
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function sourceName(value) {
  return value || "Unknown source";
}
function render(rows) {
  $("totalCount").textContent = allRows.length;
  $("highCount").textContent = allRows.filter(r => Number(r.intent_score || 0) >= 60).length;
  $("localCount").textContent = allRows.filter(r => r.location_match === true || r.location_match === "True" || r.location_match === "true").length;
  const sources = [...new Set(allRows.map(r => sourceName(r.source)))];
  $("sourceCount").textContent = sources.length;
  $("resultCount").textContent = `${rows.length} result${rows.length === 1 ? "" : "s"}`;
  $("showingText").textContent = `Showing ${rows.length} of ${allRows.length} items`;

  const filter = $("sourceFilter");
  const selected = filter.value;
  filter.innerHTML = '<option value="">All sources</option>' + sources.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
  filter.value = selected;

  const bands = [
    ["80–100", r => Number(r.intent_score || 0) >= 80],
    ["60–79", r => Number(r.intent_score || 0) >= 60 && Number(r.intent_score || 0) < 80],
    ["40–59", r => Number(r.intent_score || 0) >= 40 && Number(r.intent_score || 0) < 60],
    ["0–39", r => Number(r.intent_score || 0) < 40]
  ];
  const maxBand = Math.max(1, ...bands.map(([,fn]) => allRows.filter(fn).length));
  $("scoreBars").innerHTML = allRows.length ? bands.map(([label,fn]) => {
    const n = allRows.filter(fn).length;
    return `<div class="bar-row"><span>${label} score</span><div class="bar-track"><div class="bar-fill" style="width:${n/maxBand*100}%"></div></div><b>${n}</b></div>`;
  }).join("") : '<div class="empty">No data collected yet. Run the GitHub Actions workflow.</div>';

  const counts = sources.map(s => [s, allRows.filter(r => sourceName(r.source) === s).length]).sort((a,b) => b[1]-a[1]);
  $("sourceMix").innerHTML = counts.length ? counts.map(([s,n]) => `<div class="source-item"><span class="source-name"><i class="source-dot"></i>${esc(s)}</span><b class="source-num">${n}</b></div>`).join("") : '<div class="empty">Waiting for first collection.</div>';

  $("resultsBody").innerHTML = rows.length ? rows.map(r => {
    const local = r.location_match === true || r.location_match === "True" || r.location_match === "true";
    const score = Number(r.intent_score || 0);
    return `<tr>
      <td><span class="source-label">${esc(r.source)}</span></td>
      <td><strong title="${esc(r.title)}">${esc(r.title)}</strong><span>${esc((r.matched_keywords || "").slice(0,110))}</span></td>
      <td class="${local ? "location-yes" : "location-no"}">${local ? "Vadodara match" : "Not confirmed"}</td>
      <td><span class="score ${score < 40 ? "low" : ""}">${score}</span></td>
      <td>${esc(dateLabel(r.published_at))}</td>
      <td><a class="open-link" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Open ↗</a></td>
    </tr>`;
  }).join("") : '<tr><td colspan="6" class="empty-cell">No matching results. Try changing the filters or run the collector.</td></tr>';
}
function applyFilters() {
  const q = $("searchInput").value.toLowerCase().trim();
  const source = $("sourceFilter").value;
  const min = Number($("intentFilter").value || 0);
  const localOnly = $("locationFilter").value === "yes";
  const filtered = allRows.filter(r => {
    const haystack = `${r.title || ""} ${r.excerpt || ""} ${r.matched_keywords || ""}`.toLowerCase();
    const local = r.location_match === true || r.location_match === "True" || r.location_match === "true";
    return (!q || haystack.includes(q)) && (!source || r.source === source) &&
      Number(r.intent_score || 0) >= min && (!localOnly || local);
  });
  render(filtered);
}
async function loadData() {
  $("refreshBtn").textContent = "Loading…";
  try {
    const response = await fetch(`data/leads.json?t=${Date.now()}`, {cache:"no-store"});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    allRows = Array.isArray(data) ? data : [];
    applyFilters();
  } catch (e) {
    allRows = [];
    render([]);
    $("resultsBody").innerHTML = `<tr><td colspan="6" class="empty-cell">Could not load data/leads.json. Run the repository workflow and check GitHub Pages deployment. (${esc(e.message)})</td></tr>`;
  } finally {
    $("refreshBtn").textContent = "↻ Refresh data";
  }
}
["searchInput","sourceFilter","intentFilter","locationFilter"].forEach(id => $(id).addEventListener(id === "searchInput" ? "input" : "change", applyFilters));
$("refreshBtn").addEventListener("click", loadData);
loadData();
