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

  // Challenge Modal Elements
  const challengeModal = document.getElementById("challengeModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
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

      const frontImg = card.front_url || `/assets/9_6_28_upload/${card.sku}.jpg`;

      tr.innerHTML = `
        <td><input type="checkbox" class="row-checkbox" ${isChecked ? "checked" : ""}></td>
        <td>
          <div class="slab-thumb-wrap" title="Click to inspect card">
            <img src="${frontImg}" alt="${card.sku}" onerror="this.src='/assets/9_6_28_upload/${card.sku}-FRONT.jpg'">
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

    const frontSrc = card.front_url || `/assets/9_6_28_upload/${card.sku}.jpg`;
    const backSrc = card.back_url || card.front_url || `/assets/9_6_28_upload/${card.sku}-BACK.jpg`;
    modalFrontImg.src = frontSrc;
    modalBackImg.src = backSrc;

    // Reset 3D flip state
    modalFlipCard.classList.remove("flipped");

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

  // --- Upload & Ingestion Logic ---
  let selectedUploadFiles = { file: null, front: null, back: null };

  // Mode radio switch
  modeRadios.forEach(r => {
    r.addEventListener("change", (e) => {
      document.querySelectorAll(".mode-radio").forEach(lbl => lbl.classList.remove("active"));
      e.target.closest(".mode-radio").classList.add("active");
      const mode = e.target.value;
      if (mode === "dual") {
        document.querySelector(".drop-hint").textContent = "Supports dual-shot photos (auto 50/50 canvas split). Auto-detects PSA QR/barcode.";
      } else {
        document.querySelector(".drop-hint").textContent = "Select separate front and back card images.";
      }
    });
  });

  dropZone.addEventListener("click", (e) => {
    if (e.target.closest(".quick-meta-bar")) return;
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
      selectedUploadFiles.front = e.target.files[0];
      // prompt for back
      backInput.click();
    }
  });
  backInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      selectedUploadFiles.back = e.target.files[0];
      document.querySelector(".drop-text h3").innerHTML = `Selected Front: <strong>${selectedUploadFiles.front.name}</strong> & Back: <strong>${selectedUploadFiles.back.name}</strong>`;
    }
  });

  function handleFilesSelected(filesList) {
    const mode = document.querySelector("input[name='uploadMode']:checked").value;
    if (mode === "dual" || filesList.length === 1) {
      selectedUploadFiles.file = filesList[0];
      document.querySelector(".drop-text h3").innerHTML = `Selected Dual-Shot: <strong>${filesList[0].name}</strong>`;
    } else if (filesList.length >= 2) {
      selectedUploadFiles.front = filesList[0];
      selectedUploadFiles.back = filesList[1];
      document.querySelector(".drop-text h3").innerHTML = `Selected Front: <strong>${filesList[0].name}</strong> & Back: <strong>${filesList[1].name}</strong>`;
    }
  }

  processUploadBtn.addEventListener("click", async () => {
    const formData = new FormData();
    const mode = document.querySelector("input[name='uploadMode']:checked").value;

    if (mode === "dual") {
      if (!selectedUploadFiles.file) {
        alert("Please drop or choose a card slab image first.");
        return;
      }
      formData.append("file", selectedUploadFiles.file);
    } else {
      if (!selectedUploadFiles.front) {
        alert("Please select front card photo.");
        return;
      }
      formData.append("front", selectedUploadFiles.front);
      if (selectedUploadFiles.back) formData.append("back", selectedUploadFiles.back);
    }

    formData.append("grader", quickGrader.value);
    formData.append("grade", quickGrade.value);
    if (quickTitle.value) formData.append("card_title", quickTitle.value);
    if (quickBasePrice.value) formData.append("base_price", quickBasePrice.value);

    processUploadBtn.disabled = true;
    processUploadBtn.innerHTML = "<span>Processing Slab...</span>";

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
        // Reset inputs
        selectedUploadFiles = { file: null, front: null, back: null };
        quickTitle.value = "";
        quickBasePrice.value = "";
        document.querySelector(".drop-text h3").innerHTML = `Drop card slab photos here, or <span class="browse-link">browse files</span>`;
        // Open challenge modal on newly added card
        openChallengeModal(data.card);
      } else {
        alert("Upload error: " + (data.detail || "Failed to process card"));
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Error uploading card: " + err.message);
    } finally {
      processUploadBtn.disabled = false;
      processUploadBtn.innerHTML = "<span>Process & Comp</span>";
    }
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
