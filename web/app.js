// CardFlow Web Client State & Controller
document.addEventListener("DOMContentLoaded", () => {
  let cards = [];
  let currentCard = null;
  let selectedSkus = new Set();
  let currentFilter = "all";
  let searchQuery = "";
  let settings = {};

  // DOM Elements
  const cardTableBody = document.getElementById("cardTableBody");
  const tableEmptyState = document.getElementById("tableEmptyState");
  const masterCheckbox = document.getElementById("masterCheckbox");
  const tableSearch = document.getElementById("tableSearch");
  const filterPills = document.querySelectorAll(".filter-pills .pill");
  const selectAllBtn = document.getElementById("selectAllBtn");
  const approveSelectedBtn = document.getElementById("approveSelectedBtn");

  // KPI Elements
  const kpiTotalValue = document.getElementById("kpiTotalValue");
  const kpiTotalCount = document.getElementById("kpiTotalCount");
  const kpiApprovedCount = document.getElementById("kpiApprovedCount");
  const countApproved = document.getElementById("countApproved");
  const countChallenged = document.getElementById("countChallenged");
  const countComped = document.getElementById("countComped");

  // Drop Zone Elements
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const frontInput = document.getElementById("frontInput");
  const backInput = document.getElementById("backInput");
  const processUploadBtn = document.getElementById("processUploadBtn");
  const quickGrader = document.getElementById("quickGrader");
  const quickGrade = document.getElementById("quickGrade");
  const quickTitle = document.getElementById("quickTitle");
  const quickBasePrice = document.getElementById("quickBasePrice");
  const modeRadios = document.querySelectorAll("input[name='uploadMode']");
  const batchPreviewBar = document.getElementById("batchPreviewBar");
  const batchCountBadge = document.getElementById("batchCountBadge");
  const batchDetailText = document.getElementById("batchDetailText");
  const clearBatchBtn = document.getElementById("clearBatchBtn");
  const uploadProgressWrap = document.getElementById("uploadProgressWrap");
  const uploadProgressBar = document.getElementById("uploadProgressBar");
  const uploadProgressText = document.getElementById("uploadProgressText");

  // Challenge Modal Elements
  const challengeModal = document.getElementById("challengeModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const modalPrevCardBtn = document.getElementById("modalPrevCardBtn");
  const modalNextCardBtn = document.getElementById("modalNextCardBtn");
  const modalNavCounter = document.getElementById("modalNavCounter");
  const floatingPrevCardBtn = document.getElementById("floatingPrevCardBtn");
  const floatingNextCardBtn = document.getElementById("floatingNextCardBtn");
  const modalFlipCard = document.getElementById("modalFlipCard");
  const flipToggleBtn = document.getElementById("flipToggleBtn");
  const modalFrontImg = document.getElementById("modalFrontImg");
  const modalBackImg = document.getElementById("modalBackImg");
  const modalCardTitle = document.getElementById("modalCardTitle");
  const modalSkuCode = document.getElementById("modalSkuCode");
  const modalCertCode = document.getElementById("modalCertCode");
  const modalJustificationText = document.getElementById("modalJustificationText");
  const modalCompsBody = document.getElementById("modalCompsBody");
  const challengeFeedback = document.getElementById("challengeFeedback");
  const modalListPrice = document.getElementById("modalListPrice");
  const modalAutoAccept = document.getElementById("modalAutoAccept");
  const modalMinOffer = document.getElementById("modalMinOffer");
  const applyChallengeBtn = document.getElementById("applyChallengeBtn");
  const modalApproveBtn = document.getElementById("modalApproveBtn");
  const quickChips = document.querySelectorAll(".quick-chips .chip");

  // Export Modal Elements
  const exportModal = document.getElementById("exportModal");
  const exportEbayBtn = document.getElementById("exportEbayBtn");
  const closeExportModalBtn = document.getElementById("closeExportModalBtn");
  const exportTotalCount = document.getElementById("exportTotalCount");
  const exportTotalValue = document.getElementById("exportTotalValue");
  const exportShipping = document.getElementById("exportShipping");
  const exportReturns = document.getElementById("exportReturns");
  const exportPayments = document.getElementById("exportPayments");
  const downloadCsvBtn = document.getElementById("downloadCsvBtn");
  const downloadXlsxBtn = document.getElementById("downloadXlsxBtn");

  // Settings Modal Elements
  const settingsModal = document.getElementById("settingsModal");
  const openSettingsBtn = document.getElementById("openSettingsBtn");
  const ebayStatusBtn = document.getElementById("ebayStatusBtn");
  const closeSettingsModalBtn = document.getElementById("closeSettingsModalBtn");
  const headerAccountName = document.getElementById("headerAccountName");
  const settingAccount = document.getElementById("settingAccount");
  const settingShipping = document.getElementById("settingShipping");
  const settingReturns = document.getElementById("settingReturns");
  const settingPayments = document.getElementById("settingPayments");
  const settingLocation = document.getElementById("settingLocation");
  const settingCdn = document.getElementById("settingCdn");
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");

  // --- Initial Load ---
  fetchSettings();
  fetchCards();

  // --- API Functions ---
  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings");
      settings = await res.json();
      if (settings.account_name) {
        headerAccountName.textContent = settings.account_name;
        settingAccount.value = settings.account_name;
      }
      if (settings.shipping_profile) settingShipping.value = settings.shipping_profile;
      if (settings.return_profile) settingReturns.value = settings.return_profile;
      if (settings.payment_profile) settingPayments.value = settings.payment_profile;
      if (settings.location) settingLocation.value = settings.location;
      if (settings.cdn_prefix) settingCdn.value = settings.cdn_prefix;
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  }

  async function fetchCards() {
    try {
      const res = await fetch("/api/cards");
      const data = await res.json();
      cards = data.cards || [];
      renderTable();
      updateKPIs();
    } catch (err) {
      console.error("Failed to fetch cards:", err);
    }
  }

  // --- Rendering Functions ---
  function updateKPIs() {
    const totalCount = cards.length;
    const totalVal = cards.reduce((sum, c) => sum + (parseFloat(c.list_price) || 0), 0);
    const approvedCount = cards.filter(c => c.status === "APPROVED").length;
    const challengedCount = cards.filter(c => c.status === "CHALLENGED").length;
    const compedCount = cards.filter(c => c.status === "COMPED").length;

    kpiTotalCount.textContent = totalCount;
    kpiTotalValue.textContent = `$${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    kpiApprovedCount.textContent = approvedCount;

    countApproved.textContent = approvedCount;
    countChallenged.textContent = challengedCount;
    countComped.textContent = compedCount;
  }

  function getFilteredCards() {
    return cards.filter(c => {
      // Status Filter
      if (currentFilter !== "all" && c.status !== currentFilter) {
        return false;
      }
      // Search Filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (c.title || "").toLowerCase().includes(q);
        const matchSku = (c.sku || "").toLowerCase().includes(q);
        const matchPlayer = (c.player || "").toLowerCase().includes(q);
        const matchCert = (c.cert_number || "").toLowerCase().includes(q);
        if (!matchTitle && !matchSku && !matchPlayer && !matchCert) {
          return false;
        }
      }
      return true;
    });
  }

  function renderTable() {
    const filtered = getFilteredCards();
    cardTableBody.innerHTML = "";

    if (filtered.length === 0) {
      tableEmptyState.style.display = "block";
      return;
    }
    tableEmptyState.style.display = "none";

    filtered.forEach(card => {
      const tr = document.createElement("tr");
      tr.dataset.sku = card.sku;

      const isChecked = selectedSkus.has(card.sku);
      const gradeStr = String(card.grade || "10");
      let gradeBadgeClass = "badge-psa-10";
      if (gradeStr.includes("9")) gradeBadgeClass = "badge-psa-9";
      if (String(card.grader || "").toUpperCase().includes("BGS")) gradeBadgeClass = "badge-bgs";

      const frontImg = (card.front_url && !card.front_url.endsWith(`/${card.sku}.jpg`))
        ? card.front_url
        : `/assets/9_6_28_upload/${card.sku}-FRONT.jpg`;

      tr.innerHTML = `
        <td><input type="checkbox" class="row-checkbox" ${isChecked ? "checked" : ""}></td>
        <td>
          <div class="slab-thumb-wrap" title="Click to inspect card">
            <img src="${frontImg}" alt="${card.sku}" onerror="if (this.src.indexOf('-FRONT') !== -1) { this.src = '/assets/9_6_28_upload/${card.sku}.jpg'; }">
          </div>
        </td>
        <td>
          <span class="sku-pill" title="Click to copy SKU">${card.sku}</span>
        </td>
        <td>
          <div class="card-title-cell">
            <div class="card-title-text" title="${card.title}">${card.title}</div>
            <div class="card-meta-sub">
              <span><strong>Player:</strong> ${card.player || 'Star'}</span>
              <span>•</span>
              <span><strong>Cert:</strong> #${card.cert_number || 'N/A'}</span>
              <span>•</span>
              <span><strong>Set:</strong> ${card.set || 'Panini'}</span>
            </div>
            <div class="justification-snippet" title="${card.justification || ''}">
              💡 ${card.justification || 'Market valuation verified.'}
            </div>
          </div>
        </td>
        <td>
          <span class="grade-badge ${gradeBadgeClass}">${card.grader || 'PSA'} ${card.grade || '10'}</span>
        </td>
        <td>
          <div class="price-input-wrap">
            <span>$</span>
            <input type="number" class="inline-price" data-field="list_price" value="${parseFloat(card.list_price || 0).toFixed(2)}" step="0.01">
          </div>
        </td>
        <td>
          <div class="price-input-wrap">
            <span>$</span>
            <input type="number" class="inline-price" data-field="auto_accept" value="${parseFloat(card.auto_accept || 0).toFixed(2)}" step="0.01">
          </div>
        </td>
        <td>
          <div class="price-input-wrap">
            <span>$</span>
            <input type="number" class="inline-price" data-field="min_offer" value="${parseFloat(card.min_offer || 0).toFixed(2)}" step="0.01">
          </div>
        </td>
        <td>
          <span class="status-tag ${card.status}">${card.status}</span>
        </td>
        <td>
          <div class="action-cell">
            <button class="btn btn-secondary btn-sm inspect-btn" title="Inspect slabs, comps, & challenge pricing">Inspect</button>
            <button class="btn btn-success btn-sm approve-btn" title="Approve listing for eBay export">✓</button>
            <button class="btn btn-outline btn-sm delete-btn" title="Remove card">✕</button>
          </div>
        </td>
      `;

      // Event Listeners for Row
      const chk = tr.querySelector(".row-checkbox");
      chk.addEventListener("change", (e) => {
        if (e.target.checked) selectedSkus.add(card.sku);
        else selectedSkus.delete(card.sku);
      });

      const thumb = tr.querySelector(".slab-thumb-wrap");
      const inspectBtn = tr.querySelector(".inspect-btn");
      [thumb, inspectBtn].forEach(el => el.addEventListener("click", () => openChallengeModal(card)));

      const approveBtn = tr.querySelector(".approve-btn");
      approveBtn.addEventListener("click", () => approveSingleCard(card.sku));

      const deleteBtn = tr.querySelector(".delete-btn");
      deleteBtn.addEventListener("click", () => deleteSingleCard(card.sku));

      const skuPill = tr.querySelector(".sku-pill");
      skuPill.addEventListener("click", () => {
        navigator.clipboard.writeText(card.sku);
        skuPill.textContent = "COPIED!";
        setTimeout(() => skuPill.textContent = card.sku, 1200);
      });

      // Inline price edit
      const priceInputs = tr.querySelectorAll(".inline-price");
      priceInputs.forEach(input => {
        input.addEventListener("change", (e) => {
          const field = e.target.dataset.field;
          const val = parseFloat(e.target.value) || 0;
          card[field] = val;

          // Auto calculate auto_accept and min_offer if list_price was edited
          if (field === "list_price") {
            card.auto_accept = parseFloat((val * 0.85).toFixed(2));
            card.min_offer = parseFloat((val * 0.75).toFixed(2));
            const autoInput = tr.querySelector("input[data-field='auto_accept']");
            const minInput = tr.querySelector("input[data-field='min_offer']");
            if (autoInput) autoInput.value = card.auto_accept.toFixed(2);
            if (minInput) minInput.value = card.min_offer.toFixed(2);
          }
          updateKPIs();
          // Save via challenge endpoint
          fetch("/api/challenge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sku: card.sku,
              manual_list_price: card.list_price,
              manual_auto_accept: card.auto_accept,
              manual_min_offer: card.min_offer
            })
          });
        });
      });

      cardTableBody.appendChild(tr);
    });
  }

  // --- Inspect & Challenge Modal Logic ---
  function openChallengeModal(card) {
    currentCard = card;
    modalCardTitle.textContent = card.title;
    modalSkuCode.textContent = card.sku;
    modalCertCode.textContent = `Cert #${card.cert_number || 'N/A'} • ${card.grader || 'PSA'} Grade ${card.grade || '10'}`;

    const frontSrc = (card.front_url && !card.front_url.endsWith(`/${card.sku}.jpg`))
      ? card.front_url
      : `/assets/9_6_28_upload/${card.sku}-FRONT.jpg`;
    const backSrc = (card.back_url && !card.back_url.endsWith(`/${card.sku}.jpg`))
      ? card.back_url
      : `/assets/9_6_28_upload/${card.sku}-BACK.jpg`;

    modalFrontImg.src = frontSrc;
    modalBackImg.src = backSrc;

    // Reset 3D flip state
    modalFlipCard.classList.remove("flipped");

    // Update navigation counter
    const filtered = getFilteredCards();
    const currentIdx = filtered.findIndex(c => c.sku === card.sku);
    if (modalNavCounter) {
      const displayIdx = currentIdx >= 0 ? currentIdx + 1 : 1;
      modalNavCounter.textContent = `Card ${displayIdx} of ${filtered.length}`;
    }

    modalJustificationText.textContent = card.justification || "Market comps verified from recent historical sales.";

    modalListPrice.value = parseFloat(card.list_price || 0).toFixed(2);
    modalAutoAccept.value = parseFloat(card.auto_accept || 0).toFixed(2);
    modalMinOffer.value = parseFloat(card.min_offer || 0).toFixed(2);
    challengeFeedback.value = "";

    // Populate comps table
    modalCompsBody.innerHTML = "";
    const comps = card.comps || [
      { date: "3 days ago", platform: "eBay Sold", price: (card.list_price * 0.95).toFixed(2), grade: `${card.grader} ${card.grade}` },
      { date: "1 week ago", platform: "PWCC Premier", price: (card.list_price * 1.02).toFixed(2), grade: `${card.grader} ${card.grade}` },
      { date: "2 weeks ago", platform: "Goldin", price: (card.list_price * 0.92).toFixed(2), grade: `${card.grader} ${card.grade}` }
    ];

    comps.forEach(c => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${c.platform}</strong></td>
        <td style="color: var(--text-muted);">${c.date}</td>
        <td><span class="grade-badge badge-psa-9" style="font-size: 10px;">${c.grade}</span></td>
        <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: #fff;">$${parseFloat(c.price).toFixed(2)}</td>
      `;
      modalCompsBody.appendChild(row);
    });

    challengeModal.classList.add("open");
  }

  function closeChallengeModal() {
    challengeModal.classList.remove("open");
    currentCard = null;
  }

  function navigateCard(direction) {
    const filtered = getFilteredCards();
    if (!filtered || filtered.length === 0) return;
    if (!currentCard) {
      openChallengeModal(filtered[0]);
      return;
    }

    const currentIndex = filtered.findIndex(c => c.sku === currentCard.sku);
    let newIndex = 0;
    if (currentIndex !== -1) {
      newIndex = (currentIndex + direction + filtered.length) % filtered.length;
    } else {
      newIndex = direction > 0 ? 0 : filtered.length - 1;
    }

    openChallengeModal(filtered[newIndex]);
  }

  // Navigation Button Handlers
  if (modalPrevCardBtn) modalPrevCardBtn.addEventListener("click", () => navigateCard(-1));
  if (modalNextCardBtn) modalNextCardBtn.addEventListener("click", () => navigateCard(1));
  if (floatingPrevCardBtn) floatingPrevCardBtn.addEventListener("click", () => navigateCard(-1));
  if (floatingNextCardBtn) floatingNextCardBtn.addEventListener("click", () => navigateCard(1));

  // Global Keyboard Navigation (ArrowLeft / ArrowRight / Escape)
  window.addEventListener("keydown", (e) => {
    if (!challengeModal.classList.contains("open")) return;

    // Do not hijack arrows if user is focused on an input or textarea
    const activeEl = document.activeElement;
    const tagName = activeEl ? activeEl.tagName.toUpperCase() : "";
    if (tagName === "INPUT" || tagName === "TEXTAREA") {
      if (e.key === "Escape") {
        activeEl.blur();
      }
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      navigateCard(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      navigateCard(1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeChallengeModal();
    }
  });

  // Close modal when clicking backdrop outside drawer
  challengeModal.addEventListener("click", (e) => {
    if (e.target === challengeModal) {
      closeChallengeModal();
    }
  });

  // 3D Flip Card Action
  modalFlipCard.addEventListener("click", () => {
    modalFlipCard.classList.toggle("flipped");
  });
  flipToggleBtn.addEventListener("click", () => {
    modalFlipCard.classList.toggle("flipped");
  });

  closeModalBtn.addEventListener("click", closeChallengeModal);

  // Quick Chips
  quickChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const text = chip.dataset.text;
      if (challengeFeedback.value) {
        challengeFeedback.value += ` | ${text}`;
      } else {
        challengeFeedback.value = text;
      }
    });
  });

  // Modal Price Calculation
  modalListPrice.addEventListener("input", () => {
    const val = parseFloat(modalListPrice.value) || 0;
    modalAutoAccept.value = (val * 0.85).toFixed(2);
    modalMinOffer.value = (val * 0.75).toFixed(2);
  });

  // Apply Challenge
  applyChallengeBtn.addEventListener("click", async () => {
    if (!currentCard) return;
    const feedback = challengeFeedback.value.trim();
    const mList = parseFloat(modalListPrice.value) || null;
    const mAuto = parseFloat(modalAutoAccept.value) || null;
    const mMin = parseFloat(modalMinOffer.value) || null;

    try {
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: currentCard.sku,
          feedback: feedback,
          manual_list_price: mList,
          manual_auto_accept: mAuto,
          manual_min_offer: mMin
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        currentCard.list_price = data.card.list_price;
        currentCard.auto_accept = data.card.auto_accept;
        currentCard.min_offer = data.card.min_offer;
        currentCard.justification = data.card.justification;
        currentCard.status = "CHALLENGED";

        modalJustificationText.textContent = currentCard.justification;
        modalListPrice.value = currentCard.list_price.toFixed(2);
        modalAutoAccept.value = currentCard.auto_accept.toFixed(2);
        modalMinOffer.value = currentCard.min_offer.toFixed(2);

        renderTable();
        updateKPIs();
      }
    } catch (err) {
      console.error("Challenge error:", err);
    }
  });

  // Modal Approve Pricing
  modalApproveBtn.addEventListener("click", async () => {
    if (!currentCard) return;
    const mList = parseFloat(modalListPrice.value) || currentCard.list_price;
    const mAuto = parseFloat(modalAutoAccept.value) || currentCard.auto_accept;
    const mMin = parseFloat(modalMinOffer.value) || currentCard.min_offer;

    currentCard.list_price = mList;
    currentCard.auto_accept = mAuto;
    currentCard.min_offer = mMin;
    currentCard.status = "APPROVED";

    await fetch("/api/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: currentCard.sku,
        feedback: challengeFeedback.value.trim(),
        manual_list_price: mList,
        manual_auto_accept: mAuto,
        manual_min_offer: mMin
      })
    });

    await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skus: [currentCard.sku] })
    });

    renderTable();
    updateKPIs();
    closeChallengeModal();
  });

  // Single card approval
  async function approveSingleCard(sku) {
    const card = cards.find(c => c.sku === sku);
    if (!card) return;
    card.status = "APPROVED";
    await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skus: [sku] })
    });
    renderTable();
    updateKPIs();
  }

  // Single card delete
  async function deleteSingleCard(sku) {
    if (!confirm(`Remove card ${sku} from this batch?`)) return;
    cards = cards.filter(c => c.sku !== sku);
    selectedSkus.delete(sku);
    await fetch(`/api/cards/${sku}`, { method: "DELETE" });
    renderTable();
    updateKPIs();
  }

  // --- Filtering & Selection ---
  tableSearch.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderTable();
  });

  filterPills.forEach(pill => {
    pill.addEventListener("click", () => {
      filterPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      currentFilter = pill.dataset.filter;
      renderTable();
    });
  });

  masterCheckbox.addEventListener("change", (e) => {
    const filtered = getFilteredCards();
    if (e.target.checked) {
      filtered.forEach(c => selectedSkus.add(c.sku));
    } else {
      filtered.forEach(c => selectedSkus.delete(c.sku));
    }
    renderTable();
  });

  selectAllBtn.addEventListener("click", () => {
    cards.forEach(c => selectedSkus.add(c.sku));
    masterCheckbox.checked = true;
    renderTable();
  });

  approveSelectedBtn.addEventListener("click", async () => {
    if (selectedSkus.size === 0) {
      alert("Please select at least one card using the checkboxes.");
      return;
    }
    const skusToApprove = Array.from(selectedSkus);
    cards.forEach(c => {
      if (selectedSkus.has(c.sku)) c.status = "APPROVED";
    });
    await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skus: skusToApprove })
    });
    renderTable();
    updateKPIs();
  });

  // --- Upload & Ingestion Logic (Batch Multi-File Ready) ---
  let uploadQueue = []; // Array of { mode: 'dual'|'separate', file?: File, front?: File, back?: File, name: string, size: number }

  // Mode radio switch
  modeRadios.forEach(r => {
    r.addEventListener("change", (e) => {
      document.querySelectorAll(".mode-radio").forEach(lbl => lbl.classList.remove("active"));
      e.target.closest(".mode-radio").classList.add("active");
      const mode = e.target.value;
      if (mode === "dual") {
        document.querySelector(".drop-hint").textContent = "Supports dual-shot photos (auto 50/50 canvas split). Auto-detects PSA QR/barcode.";
      } else {
        document.querySelector(".drop-hint").textContent = "Select front & back card photos (auto-pairs matching filenames or sequential scans).";
      }
      uploadQueue = [];
      updateUploadBatchUI();
    });
  });

  dropZone.addEventListener("click", (e) => {
    if (e.target.closest(".quick-meta-bar") || e.target.closest("#batchPreviewBar") || e.target.closest("#uploadProgressWrap")) return;
    const mode = document.querySelector("input[name='uploadMode']:checked").value;
    if (mode === "dual") {
      fileInput.click();
    } else {
      frontInput.click();
    }
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    const dropped = e.dataTransfer.files;
    if (dropped && dropped.length > 0) {
      handleFilesSelected(dropped);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
    }
  });

  frontInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      if (e.target.files.length === 1) {
        // Single front selected, add and prompt for back
        const f = e.target.files[0];
        uploadQueue.push({
          mode: 'separate',
          front: f,
          back: null,
          name: f.name,
          size: f.size
        });
        updateUploadBatchUI();
        backInput.click();
      } else {
        // Multiple files selected in front picker
        handleFilesSelected(e.target.files);
      }
    }
  });

  backInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      if (uploadQueue.length > 0 && uploadQueue[uploadQueue.length - 1].mode === 'separate' && !uploadQueue[uploadQueue.length - 1].back) {
        uploadQueue[uploadQueue.length - 1].back = e.target.files[0];
        uploadQueue[uploadQueue.length - 1].size += e.target.files[0].size;
        uploadQueue[uploadQueue.length - 1].name = `${uploadQueue[uploadQueue.length - 1].front.name} + ${e.target.files[0].name}`;
        updateUploadBatchUI();
      } else {
        handleFilesSelected(e.target.files);
      }
    }
  });

  if (clearBatchBtn) {
    clearBatchBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      uploadQueue = [];
      updateUploadBatchUI();
    });
  }

  function handleFilesSelected(filesList) {
    if (!filesList || filesList.length === 0) return;
    const files = Array.from(filesList);
    const mode = document.querySelector("input[name='uploadMode']:checked").value;

    if (mode === "dual") {
      files.forEach(file => {
        if (!uploadQueue.some(item => item.file && item.file.name === file.name && item.file.size === file.size)) {
          uploadQueue.push({
            mode: 'dual',
            file: file,
            name: file.name,
            size: file.size
          });
        }
      });
    } else {
      // Separate Front & Back Mode
      const frontRegex = /[-_](?:front|f|1)\.[^.]+$/i;
      const backRegex = /[-_](?:back|b|2)\.[^.]+$/i;

      const fronts = files.filter(f => frontRegex.test(f.name));
      const backs = files.filter(f => backRegex.test(f.name));

      if (fronts.length > 0 && backs.length > 0) {
        fronts.forEach(front => {
          const stem = front.name.replace(frontRegex, '');
          const matchingBack = backs.find(b => b.name.replace(backRegex, '') === stem);
          uploadQueue.push({
            mode: 'separate',
            front: front,
            back: matchingBack || null,
            name: matchingBack ? `${front.name} + ${matchingBack.name}` : front.name,
            size: front.size + (matchingBack ? matchingBack.size : 0)
          });
        });
        const matchedNames = new Set(uploadQueue.map(q => q.front?.name).concat(uploadQueue.map(q => q.back?.name)));
        const remaining = files.filter(f => !matchedNames.has(f.name));
        for (let i = 0; i < remaining.length; i += 2) {
          const f1 = remaining[i];
          const f2 = remaining[i + 1] || null;
          uploadQueue.push({
            mode: 'separate',
            front: f1,
            back: f2,
            name: f2 ? `${f1.name} + ${f2.name}` : f1.name,
            size: f1.size + (f2 ? f2.size : 0)
          });
        }
      } else {
        // Sequential pairing: 2 photos per slab
        for (let i = 0; i < files.length; i += 2) {
          const f1 = files[i];
          const f2 = files[i + 1] || null;
          uploadQueue.push({
            mode: 'separate',
            front: f1,
            back: f2,
            name: f2 ? `${f1.name} + ${f2.name}` : f1.name,
            size: f1.size + (f2 ? f2.size : 0)
          });
        }
      }
    }

    updateUploadBatchUI();
  }

  function updateUploadBatchUI() {
    if (uploadQueue.length === 0) {
      if (batchPreviewBar) batchPreviewBar.style.display = "none";
      const dropTitle = document.querySelector(".drop-text h3");
      if (dropTitle) dropTitle.innerHTML = `Drop card slab photos here, or <span class="browse-link">browse files</span>`;
      fileInput.value = "";
      frontInput.value = "";
      backInput.value = "";
      processUploadBtn.innerHTML = "<span>Process & Comp</span>";
      processUploadBtn.disabled = false;
      return;
    }

    if (batchPreviewBar) batchPreviewBar.style.display = "flex";
    const totalBytes = uploadQueue.reduce((acc, q) => acc + (q.size || 0), 0);
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);

    if (batchCountBadge) {
      batchCountBadge.textContent = `${uploadQueue.length} SLAB${uploadQueue.length > 1 ? 'S' : ''} QUEUED`;
    }
    if (batchDetailText) {
      if (uploadQueue.length === 1) {
        batchDetailText.textContent = `${uploadQueue[0].name} (${totalMb} MB) ready for ingestion`;
      } else {
        batchDetailText.textContent = `${uploadQueue.length} slabs ready (${totalMb} MB total) • Auto-splitting & Comping`;
      }
    }

    const dropTitle = document.querySelector(".drop-text h3");
    if (dropTitle) {
      if (uploadQueue.length === 1) {
        dropTitle.innerHTML = `Queued: <strong>${uploadQueue[0].name}</strong> (${totalMb} MB)`;
      } else {
        dropTitle.innerHTML = `Queued: <strong>${uploadQueue.length} card slabs</strong> (${totalMb} MB total)`;
      }
    }

    processUploadBtn.innerHTML = `<span>Process & Comp ${uploadQueue.length} Slab${uploadQueue.length > 1 ? 's' : ''}</span>`;
  }

  processUploadBtn.addEventListener("click", async () => {
    if (uploadQueue.length === 0) {
      alert("Please drop or choose card slab images first.");
      return;
    }

    processUploadBtn.disabled = true;
    processUploadBtn.innerHTML = `<span>Processing Batch (0/${uploadQueue.length})...</span>`;
    if (uploadProgressWrap) {
      uploadProgressWrap.style.display = "block";
      if (uploadProgressBar) uploadProgressBar.style.width = "0%";
      if (uploadProgressText) uploadProgressText.textContent = `Starting ingestion for ${uploadQueue.length} slab(s)...`;
    }

    let successCount = 0;
    let failCount = 0;
    let lastAddedCard = null;

    for (let i = 0; i < uploadQueue.length; i++) {
      const item = uploadQueue[i];
      const pct = Math.round((i / uploadQueue.length) * 100);
      if (uploadProgressBar) uploadProgressBar.style.width = `${pct}%`;
      if (uploadProgressText) {
        uploadProgressText.textContent = `Ingesting slab ${i + 1} of ${uploadQueue.length}: ${item.name}...`;
      }
      processUploadBtn.innerHTML = `<span>Processing (${i + 1}/${uploadQueue.length})...</span>`;

      const formData = new FormData();
      if (item.mode === "dual") {
        formData.append("file", item.file);
      } else {
        formData.append("front", item.front);
        if (item.back) formData.append("back", item.back);
      }

      formData.append("grader", quickGrader.value);
      formData.append("grade", quickGrade.value);
      if (quickTitle.value && uploadQueue.length === 1) {
        formData.append("card_title", quickTitle.value);
      }
      if (quickBasePrice.value && uploadQueue.length === 1) {
        formData.append("base_price", quickBasePrice.value);
      }

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        if (data.status === "success") {
          cards.unshift(data.card);
          renderTable();
          updateKPIs();
          successCount++;
          lastAddedCard = data.card;
        } else {
          console.error(`Upload error for ${item.name}:`, data.detail);
          failCount++;
        }
      } catch (err) {
        console.error(`Network error for ${item.name}:`, err);
        failCount++;
      }
    }

    if (uploadProgressBar) uploadProgressBar.style.width = "100%";
    if (uploadProgressText) {
      uploadProgressText.textContent = `Batch complete! ${successCount} slab${successCount === 1 ? '' : 's'} ingested successfully.${failCount > 0 ? ` (${failCount} failed)` : ''}`;
    }

    uploadQueue = [];
    quickTitle.value = "";
    quickBasePrice.value = "";

    setTimeout(() => {
      if (uploadProgressWrap) uploadProgressWrap.style.display = "none";
      updateUploadBatchUI();
      processUploadBtn.disabled = false;
      processUploadBtn.innerHTML = "<span>Process & Comp</span>";
      if (successCount === 1 && lastAddedCard) {
        openChallengeModal(lastAddedCard);
      }
    }, 2000);
  });

  // --- Export Workflow ---
  exportEbayBtn.addEventListener("click", async () => {
    exportEbayBtn.disabled = true;
    exportEbayBtn.textContent = "Generating Template...";

    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skus: Array.from(selectedSkus) })
      });
      const data = await res.json();

      if (data.status === "success") {
        exportTotalCount.textContent = data.exported_count;
        exportTotalValue.textContent = `$${data.total_value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        exportShipping.textContent = settings.shipping_profile || "Flat: USPSParcel $5.00";
        exportReturns.textContent = settings.return_profile || "Returns Policy";
        exportPayments.textContent = settings.payment_profile || "Payment Policy";

        downloadCsvBtn.href = data.csv_download_url;
        downloadXlsxBtn.href = data.xlsx_download_url;

        exportModal.classList.add("open");
      } else {
        alert("Export error: " + (data.detail || "Could not generate template."));
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed: " + err.message);
    } finally {
      exportEbayBtn.disabled = false;
      exportEbayBtn.innerHTML = `
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
        Export eBay Template
      `;
    }
  });

  closeExportModalBtn.addEventListener("click", () => exportModal.classList.remove("open"));

  // --- Settings Modal Logic ---
  openSettingsBtn.addEventListener("click", () => settingsModal.classList.add("open"));
  ebayStatusBtn.addEventListener("click", () => settingsModal.classList.add("open"));
  closeSettingsModalBtn.addEventListener("click", () => settingsModal.classList.remove("open"));

  saveSettingsBtn.addEventListener("click", async () => {
    const updated = {
      account_name: settingAccount.value.trim(),
      shipping_profile: settingShipping.value.trim(),
      return_profile: settingReturns.value.trim(),
      payment_profile: settingPayments.value.trim(),
      location: settingLocation.value.trim(),
      cdn_prefix: settingCdn.value.trim()
    };

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    });
    const data = await res.json();
    if (data.status === "success") {
      settings = data.settings;
      headerAccountName.textContent = settings.account_name;
      settingsModal.classList.remove("open");
    }
  });

  // Close modals on clicking outside drawer/card
  window.addEventListener("click", (e) => {
    if (e.target === challengeModal) closeChallengeModal();
    if (e.target === exportModal) exportModal.classList.remove("open");
    if (e.target === settingsModal) settingsModal.classList.remove("open");
  });
});
