// --- Config ---
const API_ROOT = "https://api.github.com";

// Elements
const $username   = document.getElementById("username");
const $searchBtn  = document.getElementById("searchBtn");
const $status     = document.getElementById("status");
const $profile    = document.getElementById("profile");
const $reposTitle = document.getElementById("reposTitle");
const $reposList  = document.getElementById("reposList");
const $loadMore   = document.getElementById("loadMoreBtn");
const $loadMoreRow= document.querySelector(".load-more-row");
// const $token   = document.getElementById("token"); // optional

let paging = { page: 1, per_page: 12, username: "" };

function setStatus(msg, isError = false) {
  $status.textContent = msg || "";
  $status.style.color = isError ? "#ff6b6b" : "var(--muted)";
}

function headers() {
  const h = { "Accept": "application/vnd.github+json" };
  // if ($token?.value) h.Authorization = `Bearer ${$token.value}`; // optional
  return h;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: headers() });
  if (res.status === 404) throw new Error("User not found.");
  if (res.status === 403) {
    // Likely rate limited
    const reset = res.headers.get("x-ratelimit-reset");
    throw new Error("Rate limit reached. Try later or use a GitHub token.");
  }
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

function renderProfile(user) {
  $profile.innerHTML = `
    <img src="${user.avatar_url}" alt="${user.login}" />
    <div class="meta">
      <div class="name">${user.name ?? ""} <span class="login">@${user.login}</span></div>
      <div class="bio">${user.bio ? user.bio : ""}</div>
      <div class="counts">
        Followers: ${user.followers} • Following: ${user.following} • Public Repos: ${user.public_repos}
      </div>
      <div>
        <a href="${user.html_url}" target="_blank" rel="noopener">View GitHub Profile ↗</a>
      </div>
      ${user.location ? `<div class="loc">📍 ${user.location}</div>` : ""}
    </div>
  `;
  $profile.classList.remove("hidden");
}

function repoCard(r) {
  const updated = new Date(r.updated_at).toLocaleDateString();
  return `
    <article class="repo-card">
      <a href="${r.html_url}" target="_blank" rel="noopener">${r.name}</a>
      ${r.description ? `<div>${r.description}</div>` : ""}
      <div class="repo-meta">
        ${r.language ? `<span>🧑‍💻 ${r.language}</span>` : ""}
        <span>⭐ ${r.stargazers_count}</span>
        <span>🍴 ${r.forks_count}</span>
        <span>⏱️ Updated ${updated}</span>
      </div>
    </article>
  `;
}

function clearRepos() {
  $reposList.innerHTML = "";
  $reposTitle.classList.add("hidden");
  $loadMoreRow.classList.add("hidden");
}

async function fetchAndRenderRepos({ username, page, per_page }) {
  const url = `${API_ROOT}/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=${per_page}&page=${page}`;
  const repos = await fetchJson(url);

  if (page === 1) $reposList.innerHTML = ""; // first page fresh
  if (repos.length === 0 && page === 1) {
    $reposTitle.classList.remove("hidden");
    $reposList.innerHTML = `<p class="status">No public repositories found.</p>`;
    $loadMoreRow.classList.add("hidden");
    return;
  }

  $reposTitle.classList.remove("hidden");
  $reposList.insertAdjacentHTML("beforeend", repos.map(repoCard).join(""));

  // If less than per_page, no more pages
  if (repos.length < per_page) {
    $loadMoreRow.classList.add("hidden");
  } else {
    $loadMoreRow.classList.remove("hidden");
  }
}

async function handleSearch() {
  const username = $username.value.trim();
  if (!username) {
    setStatus("Please enter a GitHub username.");
    return;
  }

  // Reset UI
  setStatus("Loading…");
  $profile.classList.add("hidden");
  clearRepos();

  try {
    const user = await fetchJson(`${API_ROOT}/users/${encodeURIComponent(username)}`);
    renderProfile(user);

    // Setup paging and fetch repos
    paging = { username, page: 1, per_page: 12 };
    await fetchAndRenderRepos(paging);
    setStatus(""); // clear
  } catch (err) {
    setStatus(err.message || "Something went wrong.", true);
  }
}

// Events
$searchBtn.addEventListener("click", handleSearch);
$username.addEventListener("keydown", (e) => { if (e.key === "Enter") handleSearch(); });

$loadMore.addEventListener("click", async () => {
  paging.page += 1;
  setStatus("Loading more…");
  try {
    await fetchAndRenderRepos(paging);
    setStatus("");
  } catch (err) {
    setStatus(err.message || "Something went wrong.", true);
  }
});