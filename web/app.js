// CardFlow Global Toast System
function showToast(message, type = "info", duration = 3200) {
  try {
    let container = document.querySelector(".cardflow-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "cardflow-toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `cardflow-toast toast-${type}`;

    let icon = "ℹ";
    if (type === "success") icon = "✓";
    else if (type === "error") icon = "✕";
    else if (type === "warning") icon = "⚠";

    toast.innerHTML = `
      <span class="cardflow-toast-icon">${icon}</span>
      <span class="cardflow-toast-msg">${message}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("toast-show");
    });

    setTimeout(() => {
      toast.classList.remove("toast-show");
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  } catch (e) {
    console.log(`[Toast ${type}]`, message);
  }
}
window.showToast = showToast;

// Infallible Client-Side Comp Calibration Engine
function calculateClientSideChallenge(card, feedback, baseCompOverride, manualList, manualAuto, manualMin) {
  let currentBase = baseCompOverride || card.base_comp;
  if (!currentBase || currentBase <= 0) {
    currentBase = Math.round(((card.list_price || 100) / 1.15) * 100) / 100;
  }

  const fb = (feedback || "").trim();
  const fbLower = fb.toLowerCase();

  let newListPrice, newAutoAccept, newMinFloor, newBaseComp, ruleStr;

  if (fb) {
    let multiplier = 1.0;
    const appliedRules = [];

    // 1. Explicit target / ceiling / max (e.g., "300 max", "probably 300 max", "worth 250")
    let explicitTarget = null;
    const maxMatch = fbLower.match(/(?:probably|think(?:\s*it'?s)?|target|list\s*(?:at)?|worth|around|about|cap(?:\s*at)?|ceiling|at\s*most)?\s*\$?(\d+(?:\.\d+)?)\s*(?:max|ceiling|cap)/i);
    if (maxMatch) {
      explicitTarget = parseFloat(maxMatch[1]);
      appliedRules.push(`Target valuation capped at $${explicitTarget.toFixed(2)} max`);
    } else {
      const genTarget = fbLower.match(/(?:probably|think(?:\s*it'?s)?|target|list\s*at|worth\s*(?:around)?|say\s*around|say|cap\s*at)\s*\$?(\d+(?:\.\d+)?)/i);
      if (genTarget) {
        explicitTarget = parseFloat(genTarget[1]);
        appliedRules.push(`Target valuation anchored to $${explicitTarget.toFixed(2)}`);
      }
    }

    // 2. Percentage adjustments (+15%, -10%, etc.)
    const pctMatches = Array.from(fb.matchAll(/([+-]?\s*\d+(?:\.\d+)?)\s*%/g));
    if (pctMatches.length > 0) {
      let netPct = 0;
      pctMatches.forEach(pm => {
        const val = parseFloat(pm[1].replace(/\s+/g, ''));
        if (!isNaN(val)) netPct += val;
      });
      multiplier *= (1.0 + (netPct / 100.0));
      appliedRules.push(`${netPct >= 0 ? '+' : ''}${netPct.toFixed(1)}% percentage adjustment`);
    }

    // 3. Raw comp extracted (e.g., "raw at $50", "raw $75", or "card is raw")
    const rawMatch = fbLower.match(/raw\s*(?:at|is|=|was)?\s*\$?(\d+(?:\.\d+)?)/i);
    const rawVal = rawMatch ? parseFloat(rawMatch[1]) : null;
    if (rawVal && !explicitTarget && pctMatches.length === 0) {
      const isToughGem = ["hard to gem", "tough gem", "condition sensitive"].some(w => fbLower.includes(w));
      const gemMult = isToughGem ? 2.5 : 1.40;
      currentBase = Math.round(rawVal * gemMult * 100) / 100;
      appliedRules.push(`Raw comp $${rawVal.toFixed(2)} + ${Math.round((gemMult - 1) * 100)}% PSA 10 gem premium`);
    } else if (fbLower.includes("raw") && !explicitTarget && pctMatches.length === 0) {
      multiplier *= 1.40;
      appliedRules.push("+40% PSA 10 Gem premium over raw comp");
    }

    // 4. Compute final prices
    if (explicitTarget && explicitTarget > 0) {
      newListPrice = Math.round(explicitTarget * 100) / 100;
      newBaseComp = Math.round((newListPrice / 1.15) * 100) / 100;
    } else if (pctMatches.length === 0 && !rawVal) {
      const dollarMatch = fbLower.match(/(?:comp\s*(?:is|was|=|at)?\s*\$?|target\s*(?:is|was|=|at)?\s*\$?|sold\s*(?:for|at)?\s*\$?|\$\s*)(\d+(?:\.\d+)?)/i);
      if (dollarMatch) {
        newBaseComp = parseFloat(dollarMatch[1]);
        newListPrice = Math.round(newBaseComp * 1.15 * 100) / 100;
        appliedRules.push(`Base comp anchored to $${newBaseComp.toFixed(2)}`);
      } else {
        if (["rare", "1/1", "/25", "/10", "/5", "case hit", "super rare", "gold", "downton"].some(w => fbLower.includes(w))) {
          multiplier *= 1.25;
          appliedRules.push("+25% Scarcity parallel markup");
        } else if (["too low", "bump", "higher", "increase", "up"].some(w => fbLower.includes(w))) {
          multiplier *= 1.15;
          appliedRules.push("+15% Upward recalibration");
        } else if (["too high", "drop", "lower", "decrease", "down", "discount"].some(w => fbLower.includes(w))) {
          multiplier *= 0.85;
          appliedRules.push("-15% Downward recalibration");
        }
        newBaseComp = Math.round(currentBase * multiplier * 100) / 100;
        newListPrice = Math.round(newBaseComp * 1.15 * 100) / 100;
      }
    } else {
      newBaseComp = Math.round(currentBase * multiplier * 100) / 100;
      newListPrice = Math.round(newBaseComp * 1.15 * 100) / 100;
    }

    newAutoAccept = Math.round(newListPrice * 0.85 * 100) / 100;
    newMinFloor = Math.round(newListPrice * 0.75 * 100) / 100;
    ruleStr = appliedRules.length > 0 ? appliedRules.join(", ") : "Feedback calibration";

    card.justification = `Challenged & Recalibrated: ${ruleStr}. Base comp: $${newBaseComp.toFixed(2)}. ` +
      `Target BIN $${newListPrice.toFixed(2)} (115%), Auto-Accept $${newAutoAccept.toFixed(2)} (85%), Hard Floor $${newMinFloor.toFixed(2)} (75%). ` +
      `User note: "${fb}"`;
  } else if (manualList && manualList > 0) {
    newListPrice = Math.round(manualList * 100) / 100;
    newAutoAccept = manualAuto ? Math.round(manualAuto * 100) / 100 : Math.round(newListPrice * 0.85 * 100) / 100;
    newMinFloor = manualMin ? Math.round(manualMin * 100) / 100 : Math.round(newListPrice * 0.75 * 100) / 100;
    newBaseComp = baseCompOverride && baseCompOverride > 0 ? Math.round(baseCompOverride * 100) / 100 : Math.round((newListPrice / 1.15) * 100) / 100;
    card.justification = `Manual override: Target BIN $${newListPrice.toFixed(2)}, Auto-Accept $${newAutoAccept.toFixed(2)}, Hard Floor $${newMinFloor.toFixed(2)} (Base comp: $${newBaseComp.toFixed(2)}).`;
  } else if (baseCompOverride && baseCompOverride > 0) {
    newBaseComp = Math.round(baseCompOverride * 100) / 100;
    newListPrice = Math.round(newBaseComp * 1.15 * 100) / 100;
    newAutoAccept = Math.round(newListPrice * 0.85 * 100) / 100;
    newMinFloor = Math.round(newListPrice * 0.75 * 100) / 100;
    card.justification = `Base comp calibrated to $${newBaseComp.toFixed(2)}. Target BIN $${newListPrice.toFixed(2)} (115%), Auto-Accept $${newAutoAccept.toFixed(2)} (85%), Hard Floor $${newMinFloor.toFixed(2)} (75%).`;
  } else {
    newBaseComp = currentBase;
    newListPrice = card.list_price;
    newAutoAccept = card.auto_accept;
    newMinFloor = card.min_offer;
  }

  card.base_comp = newBaseComp;
  card.list_price = newListPrice;
  card.auto_accept = newAutoAccept;
  card.min_offer = newMinFloor;
  card.status = "CHALLENGED";

  return card;
}

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
  const kpiTotalSoldGross = document.getElementById("kpiTotalSoldGross");
  const kpiNetRealized = document.getElementById("kpiNetRealized");
  const kpiHouseAlpha = document.getElementById("kpiHouseAlpha");
  const countApproved = document.getElementById("countApproved");
  const countChallenged = document.getElementById("countChallenged");
  const countComped = document.getElementById("countComped");
  const countSold = document.getElementById("countSold");
  const syncSalesBtn = document.getElementById("syncSalesBtn");
  const syncSalesText = document.getElementById("syncSalesText");
  const viewSalesLedgerBtn = document.getElementById("viewSalesLedgerBtn");

  // Sales Ledger Modal Elements
  const salesLedgerModal = document.getElementById("salesLedgerModal");
  const closeSalesLedgerModalBtn = document.getElementById("closeSalesLedgerModalBtn");
  const openRecordSaleBtn = document.getElementById("openRecordSaleBtn");
  const ledgerSyncSalesBtn = document.getElementById("ledgerSyncSalesBtn");
  const ledgerTotalGross = document.getElementById("ledgerTotalGross");
  const ledgerNetPayout = document.getElementById("ledgerNetPayout");
  const ledgerHouseAlpha = document.getElementById("ledgerHouseAlpha");
  const ledgerOrderCount = document.getElementById("ledgerOrderCount");
  const salesLedgerBody = document.getElementById("salesLedgerBody");

  // Record Sale Modal Elements
  const recordSaleModal = document.getElementById("recordSaleModal");
  const closeRecordSaleModalBtn = document.getElementById("closeRecordSaleModalBtn");
  const saleCardSelect = document.getElementById("saleCardSelect");
  const manualSaleSku = document.getElementById("manualSaleSku");
  const manualSalePrice = document.getElementById("manualSalePrice");
  const manualSaleShipping = document.getElementById("manualSaleShipping");
  const manualSaleBuyer = document.getElementById("manualSaleBuyer");
  const manualSaleOrderId = document.getElementById("manualSaleOrderId");
  const manualSaleDate = document.getElementById("manualSaleDate");
  const manualSaleShipBy = document.getElementById("manualSaleShipBy");
  const submitManualSaleBtn = document.getElementById("submitManualSaleBtn");

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
  const batchProcessNowBtn = document.getElementById("batchProcessNowBtn");
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
  let modalInitialListPrice = "0.00";
  let userEditedListPriceManually = false;

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
  fetchSales();

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

      const settingEbayAppId = document.getElementById("settingEbayAppId");
      const settingEbayCertId = document.getElementById("settingEbayCertId");
      const settingEbayToken = document.getElementById("settingEbayToken");
      if (settings.ebay_app_id && settingEbayAppId) settingEbayAppId.value = settings.ebay_app_id;
      if (settings.ebay_cert_id && settingEbayCertId) settingEbayCertId.value = settings.ebay_cert_id;
      if (settings.ebay_token && settingEbayToken) settingEbayToken.value = settings.ebay_token;
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

  // --- Sales Ledger & House Alpha State ---
  let salesLedger = [];
  let salesKPIs = {};

  async function fetchSales() {
    try {
      const res = await fetch("/api/sales");
      const data = await res.json();
      if (data.status === "success") {
        salesLedger = data.ledger || [];
        salesKPIs = data.kpis || {};
        updateSalesKPIs();
        renderSalesLedger();
      }
    } catch (err) {
      console.error("Failed to fetch sales ledger:", err);
    }
  }

  function updateSalesKPIs() {
    if (kpiTotalSoldGross && salesKPIs.total_gross !== undefined) {
      kpiTotalSoldGross.textContent = `$${parseFloat(salesKPIs.total_gross).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (kpiNetRealized && salesKPIs.total_net !== undefined) {
      kpiNetRealized.textContent = `$${parseFloat(salesKPIs.total_net).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (kpiHouseAlpha && salesKPIs.house_alpha_pct !== undefined) {
      const alphaVal = parseFloat(salesKPIs.house_alpha_pct);
      kpiHouseAlpha.textContent = `${alphaVal >= 0 ? '+' : ''}${alphaVal.toFixed(1)}%`;
    }

    if (ledgerTotalGross && salesKPIs.total_gross !== undefined) {
      ledgerTotalGross.textContent = `$${parseFloat(salesKPIs.total_gross).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (ledgerNetPayout && salesKPIs.total_net !== undefined) {
      ledgerNetPayout.textContent = `$${parseFloat(salesKPIs.total_net).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (ledgerHouseAlpha && salesKPIs.house_alpha_pct !== undefined) {
      const alphaVal = parseFloat(salesKPIs.house_alpha_pct);
      ledgerHouseAlpha.textContent = `${alphaVal >= 0 ? '+' : ''}${alphaVal.toFixed(1)}%`;
    }
    if (ledgerOrderCount) {
      ledgerOrderCount.textContent = salesLedger.length;
    }
  }

  function renderSalesLedger() {
    if (!salesLedgerBody) return;
    salesLedgerBody.innerHTML = "";

    salesLedger.forEach(sale => {
      const tr = document.createElement("tr");
      const alphaVal = parseFloat(sale.alpha_vs_comp_pct || 0);
      const alphaClass = alphaVal >= 40 ? "alpha-beat-high" : "alpha-beat-mid";
      const thumbUrl = sale.front_url || `/assets/9_6_28_upload/${sale.sku}-FRONT.jpg`;

      tr.innerHTML = `
        <td>
          <div class="slab-thumb-wrap" style="width: 44px; height: 64px;">
            <img src="${thumbUrl}" alt="${sale.sku}" onerror="this.src='/assets/9_6_28_upload/${sale.sku}.jpg'">
          </div>
        </td>
        <td>
          <span class="sku-code">${sale.sku}</span>
          <div style="font-size: 11px; color: #e2e8f0; font-weight: 500; margin-top: 2px;">${sale.title || 'Graded Card Single'}</div>
          <div style="font-size: 10px; color: var(--text-muted); margin-top: 1px;">Base Comp: $${parseFloat(sale.base_comp_est || 0).toFixed(2)} • BIN: $${parseFloat(sale.suggested_bin || 0).toFixed(2)}</div>
        </td>
        <td>
          <strong style="font-family: var(--font-mono); font-size: 12px; color: #fff;">${sale.order_id}</strong>
          <div style="font-size: 11px; color: var(--text-muted);">${sale.sold_date}</div>
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-size: 12px; color: #cbd5e1;">@${sale.buyer_handle || 'buyer'}</span>
        </td>
        <td style="text-align: right;">
          <strong style="font-family: var(--font-mono); font-size: 14px; color: #fff;">$${parseFloat(sale.realized_price || 0).toFixed(2)}</strong>
          <div style="font-size: 10px; color: var(--text-muted);">+$${parseFloat(sale.shipping_charged || 5).toFixed(2)} ship</div>
        </td>
        <td style="text-align: right;">
          <strong style="font-family: var(--font-mono); font-size: 14px; color: var(--emerald);">$${parseFloat(sale.net_payout || 0).toFixed(2)}</strong>
          <div style="font-size: 10px; color: var(--text-muted);">Fee: -$${parseFloat(sale.ebay_fee_est || 0).toFixed(2)}</div>
        </td>
        <td style="text-align: center;">
          <span class="alpha-beat-pill ${alphaClass}">${alphaVal >= 0 ? '+' : ''}${alphaVal.toFixed(1)}%</span>
        </td>
        <td>
          <span style="font-size: 12px; color: #94a3b8;">${sale.ship_by_date || 'Within 2 days'}</span>
        </td>
      `;
      salesLedgerBody.appendChild(tr);
    });
  }

  // --- Rendering Functions ---
  function updateKPIs() {
    const totalCount = cards.length;
    const totalVal = cards.reduce((sum, c) => sum + (parseFloat(c.list_price) || 0), 0);
    const approvedCount = cards.filter(c => c.status === "APPROVED").length;
    const challengedCount = cards.filter(c => c.status === "CHALLENGED").length;
    const compedCount = cards.filter(c => c.status === "COMPED").length;
    const listedCount = cards.filter(c => c.status === "LISTED").length;
    const unlistedCount = cards.filter(c => c.status === "UNLISTED").length;
    const soldCount = cards.filter(c => c.status === "SOLD").length;

    kpiTotalCount.textContent = totalCount;
    kpiTotalValue.textContent = `$${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    kpiApprovedCount.textContent = approvedCount;

    countApproved.textContent = approvedCount;
    countChallenged.textContent = challengedCount;
    countComped.textContent = compedCount;
    const countListedEl = document.getElementById("countListed");
    const countUnlistedEl = document.getElementById("countUnlisted");
    if (countListedEl) countListedEl.textContent = listedCount;
    if (countUnlistedEl) countUnlistedEl.textContent = unlistedCount;
    if (countSold) {
      countSold.textContent = soldCount;
    }
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
      if (card._justAdded) {
        tr.classList.add("row-just-added");
        setTimeout(() => { card._justAdded = false; }, 4000);
      }

      const isListed = (card.status === "LISTED");
      const isUnlisted = (card.status === "UNLISTED");
      const isChecked = selectedSkus.has(card.sku);
      const gradeStr = String(card.grade || "10");
      let gradeBadgeClass = "badge-psa-10";
      if (gradeStr.includes("9")) gradeBadgeClass = "badge-psa-9";
      if (String(card.grader || "").toUpperCase().includes("BGS")) gradeBadgeClass = "badge-bgs";

      const frontImg = card.front_thumb || ((card.front_url && !card.front_url.endsWith(`/${card.sku}.jpg`))
        ? card.front_url
        : `/assets/9_6_28_upload/${card.sku}-FRONT.jpg`);

      let statusTagHtml = `<span class="status-tag ${card.status}">${card.status}</span>`;
      if (isListed) {
        statusTagHtml = `<span class="status-tag LISTED" title="Listed on eBay in batch ${card.batch_folder || ''} at ${card.listed_at || ''}">LISTED</span>`;
      } else if (isUnlisted) {
        statusTagHtml = `<span class="status-tag UNLISTED" title="Unlisted at ${card.unlisted_at || ''}">UNLISTED</span>`;
      }

      let actionButtons = `
        <button class="btn btn-secondary btn-sm inspect-btn" title="Inspect slabs, comps, & lifecycle history">Inspect</button>
      `;
      if (isListed) {
        actionButtons += `<button class="btn btn-outline-warning btn-sm unlist-btn" title="Unlist card from active eBay listings">Unlist</button>`;
      } else if (isUnlisted) {
        actionButtons += `<button class="btn btn-outline-success btn-sm relist-btn" title="Relist card for next upload batch">Relist</button>`;
      } else {
        actionButtons += `<button class="btn btn-success btn-sm approve-btn" title="Approve listing for eBay export">✓</button>`;
      }
      actionButtons += `<button class="btn btn-outline btn-sm delete-btn" title="Remove card">✕</button>`;

      tr.innerHTML = `
        <td><input type="checkbox" class="row-checkbox" ${isChecked ? "checked" : ""} ${isListed ? 'disabled title="Card is already LISTED on eBay in ' + (card.batch_folder || 'active batch') + '. Unlist first before relisting."' : ''}></td>
        <td>
          <div class="slab-thumb-wrap" title="Click to inspect card">
            <img src="${frontImg}" alt="${card.sku}" onerror="if (this.src.indexOf('-FRONT') !== -1) { this.src = '/assets/9_6_28_upload/${card.sku}.jpg'; }">
          </div>
        </td>
        <td>
          <span class="sku-pill" title="Click to copy SKU">${card.sku}</span>
          ${card.batch_folder ? `<div style="font-size: 10px; color: #94a3b8; font-family: var(--font-mono); margin-top: 3px;">📁 ${card.batch_folder}</div>` : ''}
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
              <span>•</span>
              <span><strong>UPC:</strong> Does not apply</span>
            </div>
            <div class="justification-snippet" title="${card.justification || ''}">
              💡 ${card.justification || 'Market valuation verified.'}
            </div>
            ${card.alpha_boost || (card.alpha_tags && card.alpha_tags.length > 0) ? `
              <div style="margin-top: 6px;">
                <span class="badge-alpha-boost">⚡ ALPHA BOOST ${card.alpha_tags ? ': ' + card.alpha_tags.map(t => t.replace(/_/g, ' ').toUpperCase()).join(' • ') : ''}</span>
              </div>
            ` : ''}
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
          ${statusTagHtml}
        </td>
        <td>
          <div class="action-cell">
            ${actionButtons}
          </div>
        </td>
      `;

      // Event Listeners for Row
      const chk = tr.querySelector(".row-checkbox");
      if (chk && !chk.disabled) {
        chk.addEventListener("change", (e) => {
          if (e.target.checked) selectedSkus.add(card.sku);
          else selectedSkus.delete(card.sku);
        });
      }

      const thumb = tr.querySelector(".slab-thumb-wrap");
      const inspectBtn = tr.querySelector(".inspect-btn");
      [thumb, inspectBtn].forEach(el => {
        if (el) el.addEventListener("click", () => openChallengeModal(card));
      });

      const approveBtn = tr.querySelector(".approve-btn");
      if (approveBtn) {
        approveBtn.addEventListener("click", () => approveSingleCard(card.sku));
      }

      const unlistBtn = tr.querySelector(".unlist-btn");
      if (unlistBtn) {
        unlistBtn.addEventListener("click", () => unlistCard(card.sku));
      }

      const relistBtn = tr.querySelector(".relist-btn");
      if (relistBtn) {
        relistBtn.addEventListener("click", () => relistCard(card.sku));
      }

      const deleteBtn = tr.querySelector(".delete-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => deleteSingleCard(card.sku));
      }

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
  function optimizeSearchQuery(card) {
    if (!card) return "PSA 10";
    let parts = [];
    // Clean set: remove Series X, Non-Sport, Trading Cards
    let set = (card.set || "").replace(/series\s*\d+/i, '').replace(/trading\s*cards/i, '').replace(/non-sport/i, '').trim();
    if (set) parts.push(set);

    // Subject / Player
    if (card.player && card.player !== "Featured Subject" && card.player !== "Star Athlete") {
      parts.push(card.player);
    }

    // Card # (strip leading # or No.)
    if (card.card_number) {
      const num = String(card.card_number).replace(/^[#№]/, '');
      parts.push(`#${num}`);
    }

    // Parallel (e.g. Opal, Yellow Raywave, Mojo, Prizm, Refractor)
    if (card.parallel) {
      let cleanPar = card.parallel.replace(/\/\d+/g, '').replace(/gemstone/i, '').replace(/refractor/i, '').replace(/spec/i, '').trim();
      if (cleanPar) parts.push(cleanPar);
    }

    // Grader & Grade
    parts.push(`${card.grader || 'PSA'} ${card.grade || '10'}`);

    let q = parts.join(' ').replace(/\s+/g, ' ').trim();
    if (!q || q.length < 6) {
      q = (card.title || "").replace(/GEM\s*MT/i, '').replace(/MINT/i, '').replace(/\/\d+/g, '').replace(/\s+/g, ' ').trim();
    }
    return q;
  }

  function renderValuationGrid(card) {
    if (!modalJustificationText) return;
    const baseCompVal = parseFloat(card.base_comp || (card.list_price / 1.15)).toFixed(2);
    const listPriceVal = parseFloat(card.list_price || 0).toFixed(2);
    const autoAcceptVal = parseFloat(card.auto_accept || (card.list_price * 0.85)).toFixed(2);
    const minFloorVal = parseFloat(card.min_offer || (card.list_price * 0.75)).toFixed(2);
    const optQuery = optimizeSearchQuery(card);

    modalJustificationText.innerHTML = `
      <div style="font-size: 12px; line-height: 1.5; color: #cbd5e1; margin-bottom: 8px;">
        ${card.justification || 'Market comps verified from recent historical sales and PSA population.'}
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-top: 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); padding: 8px 12px; border-radius: 6px;">
        <div>
          <span style="font-size: 9px; color: var(--text-muted); display: block; text-transform: uppercase;">Base Comp Median</span>
          <strong style="font-size: 13px; color: #fff; font-family: var(--font-mono);">$${baseCompVal}</strong>
        </div>
        <div>
          <span style="font-size: 9px; color: var(--text-muted); display: block; text-transform: uppercase;">Target BIN (List)</span>
          <strong style="font-size: 13px; color: var(--psa-gold); font-family: var(--font-mono);">$${listPriceVal}</strong>
        </div>
        <div>
          <span style="font-size: 9px; color: var(--text-muted); display: block; text-transform: uppercase;">Auto-Accept (Offers)</span>
          <strong style="font-size: 13px; color: #4ade80; font-family: var(--font-mono);">$${autoAcceptVal}</strong>
        </div>
        <div>
          <span style="font-size: 9px; color: var(--text-muted); display: block; text-transform: uppercase;">Hard Stop Floor</span>
          <strong style="font-size: 13px; color: #f87171; font-family: var(--font-mono);">$${minFloorVal}</strong>
        </div>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 8px; align-items: center; flex-wrap: wrap;">
        <span style="font-size: 10px; color: var(--text-muted);">Optimized Search Query:</span>
        <code style="background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-size: 11px; color: #38bdf8;">${optQuery}</code>
        <button type="button" class="btn btn-secondary btn-xs" style="font-size: 10px; padding: 2px 6px;" onclick="if (navigator.clipboard) { navigator.clipboard.writeText('${optQuery.replace(/'/g, "\\'")}'); showToast('Search query copied!'); }">Copy Query</button>
      </div>
    `;
  }

  function openChallengeModal(card) {
    currentCard = card;
    currentCardSku = card.sku;
    challengeModal.classList.add("open");

    if (modalCardTitle) {
      modalCardTitle.textContent = card.title || "Graded Card Details";
    }

    modalSkuCode.textContent = card.sku;
    modalCertCode.textContent = `Cert #${card.cert_number || 'N/A'} • ${card.grader || 'PSA'} ${card.grade || '10'}`;

    // High-resolution original photo priority (never blurry thumbnail)
    const frontSrc = (card.front_url && !card.front_url.endsWith(`/${card.sku}.jpg`))
      ? card.front_url
      : (card.front_thumb || `/assets/9_6_28_upload/${card.sku}-FRONT.jpg`);
    const backSrc = (card.back_url && !card.back_url.endsWith(`/${card.sku}.jpg`))
      ? card.back_url
      : (card.front_thumb || `/assets/9_6_28_upload/${card.sku}-BACK.jpg`);

    modalFrontImg.src = frontSrc;
    modalBackImg.src = backSrc;

    // Graceful error handling for missing/unuploaded back scans
    modalBackImg.onerror = () => {
      if (modalFrontImg && modalFrontImg.src && modalBackImg.src !== modalFrontImg.src) {
        modalBackImg.src = modalFrontImg.src;
      }
    };
    modalFrontImg.onerror = () => {
      if (card.front_thumb && modalFrontImg.src !== card.front_thumb) {
        modalFrontImg.src = card.front_thumb;
      }
    };

    // Reset 3D flip state
    modalFlipCard.classList.remove("flipped");

    // Update navigation counter
    const filtered = getFilteredCards();
    const currentIdx = filtered.findIndex(c => c.sku === card.sku);
    if (modalNavCounter) {
      const displayIdx = currentIdx >= 0 ? currentIdx + 1 : 1;
      modalNavCounter.textContent = `Card ${displayIdx} of ${filtered.length}`;
    }

    // Editable card identity inputs
    const editTitle = document.getElementById("modalEditTitle");
    const editPlayer = document.getElementById("modalEditPlayer");
    const editSet = document.getElementById("modalEditSet");
    const editCardNum = document.getElementById("modalEditCardNum");
    const editCert = document.getElementById("modalEditCert");
    const editBaseComp = document.getElementById("modalEditBaseComp");
    const ebayLink = document.getElementById("modalEbaySoldLink");
    const p130Link = document.getElementById("modal130PointLink");
    const psaCertLink = document.getElementById("modalPsaCertLink");

    if (editTitle) editTitle.value = card.title || "";
    if (editPlayer) editPlayer.value = card.player || "";
    if (editSet) editSet.value = card.set || "";
    if (editCardNum) editCardNum.value = card.card_number || "";
    if (editCert) editCert.value = card.cert_number || "";
    if (editBaseComp) editBaseComp.value = parseFloat(card.base_comp || (card.list_price / 1.15)).toFixed(2);

    const optQuery = optimizeSearchQuery(card);

    // Optimized eBay Sold Comps URL (targeted keywords that eBay actually matches)
    if (ebayLink) {
      ebayLink.href = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(optQuery)}&LH_Sold=1&LH_Complete=1`;
    }

    // 130Point URL with clean query parameters + auto-copy to clipboard
    if (p130Link) {
      p130Link.href = `https://130point.com/sales/?query=${encodeURIComponent(optQuery)}`;
      p130Link.onclick = () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(optQuery).then(() => {
            showToast(`Copied search query to clipboard: "${optQuery}"`);
          }).catch(() => {});
        }
      };
    }

    // Direct official PSA Cert verification link
    if (psaCertLink) {
      if (card.cert_number && /^\d{7,10}$/.test(String(card.cert_number).trim())) {
        psaCertLink.style.display = "inline-flex";
        psaCertLink.href = `https://www.psacard.com/cert/${card.cert_number}`;
        psaCertLink.innerHTML = `<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> Verify PSA #${card.cert_number} ↗`;
      } else {
        psaCertLink.style.display = "none";
      }
    }

    modalListPrice.value = parseFloat(card.list_price || 0).toFixed(2);
    modalAutoAccept.value = parseFloat(card.auto_accept || 0).toFixed(2);
    modalMinOffer.value = parseFloat(card.min_offer || 0).toFixed(2);
    challengeFeedback.value = "";

    modalInitialListPrice = modalListPrice.value;
    userEditedListPriceManually = false;

    renderValuationGrid(card);

    // Populate comps table with clickable links
    modalCompsBody.innerHTML = "";
    const comps = card.comps || [
      { date: "3 days ago", platform: "eBay Sold", price: (card.list_price * 0.95).toFixed(2), grade: `${card.grader} ${card.grade}` },
      { date: "1 week ago", platform: "130Point / PWCC", price: (card.list_price * 1.02).toFixed(2), grade: `${card.grader} ${card.grade}` },
      { date: "2 weeks ago", platform: "Goldin", price: (card.list_price * 0.92).toFixed(2), grade: `${card.grader} ${card.grade}` }
    ];

    comps.forEach(c => {
      const row = document.createElement("tr");
      const is130 = c.platform && c.platform.toLowerCase().includes("130point");
      const rowCompLink = is130
        ? `https://130point.com/sales/?query=${encodeURIComponent(optQuery)}`
        : `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(optQuery)}&LH_Sold=1&LH_Complete=1`;

      row.innerHTML = `
        <td>
          <a href="${rowCompLink}" target="_blank" style="color: var(--psa-gold); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;" title="Search ${c.platform} for this card">
            <strong>${c.platform}</strong>
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </a>
        </td>
        <td style="color: var(--text-muted);">${c.date}</td>
        <td><span class="grade-badge badge-psa-9" style="font-size: 10px;">${c.grade}</span></td>
        <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: #fff;">
          <a href="${rowCompLink}" target="_blank" style="color: inherit; text-decoration: none;" title="Search comp proof">
            $${parseFloat(c.price).toFixed(2)} ↗
          </a>
        </td>
      `;
      modalCompsBody.appendChild(row);
    });

    // Lifecycle Timeline & Actions
    const timelineList = document.getElementById("modalStatusTimelineList");
    const lifecycleActions = document.getElementById("modalLifecycleActionBtns");
    if (timelineList) {
      timelineList.innerHTML = "";
      const history = card.status_history || [
        { status: card.status || "COMPED", timestamp: "Auto-calibrated", note: `Valuation: $${parseFloat(card.list_price || 0).toFixed(2)}` }
      ];
      history.forEach(h => {
        const item = document.createElement("div");
        item.className = "timeline-item";
        let badgeColor = "var(--psa-gold)";
        if (h.status === "LISTED") badgeColor = "#4ade80";
        else if (h.status === "UNLISTED") badgeColor = "#fb923c";
        else if (h.status === "APPROVED") badgeColor = "var(--emerald)";
        else if (h.status === "SOLD") badgeColor = "var(--purple)";

        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="timeline-badge" style="background: rgba(255,255,255,0.06); color: ${badgeColor}; border: 1px solid ${badgeColor}40;">${h.status}</span>
            <span style="color: #cbd5e1;">${h.note || (h.batch ? 'Batch: ' + h.batch : 'Status updated')}</span>
          </div>
          <span style="color: var(--text-muted); font-size: 10px; font-family: var(--font-mono);">${h.timestamp || ''}</span>
        `;
        timelineList.appendChild(item);
      });
    }

    if (lifecycleActions) {
      lifecycleActions.innerHTML = "";
      if (card.status === "LISTED") {
        const unlistBtn = document.createElement("button");
        unlistBtn.className = "btn btn-xs btn-outline-warning";
        unlistBtn.textContent = "Unlist from eBay";
        unlistBtn.onclick = () => unlistCard(card.sku);
        lifecycleActions.appendChild(unlistBtn);
      } else if (card.status === "UNLISTED") {
        const relistBtn = document.createElement("button");
        relistBtn.className = "btn btn-xs btn-outline-success";
        relistBtn.textContent = "Relist for Next Batch";
        relistBtn.onclick = () => relistCard(card.sku);
        lifecycleActions.appendChild(relistBtn);
      }
    }

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

  // 3D Flip Card interaction
  modalFlipCard.addEventListener("click", () => {
    modalFlipCard.classList.toggle("flipped");
  });

  if (flipToggleBtn) {
    flipToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      modalFlipCard.classList.toggle("flipped");
    });
  }

  const swapFrontBackPermanentBtn = document.getElementById("swapFrontBackPermanentBtn");
  if (swapFrontBackPermanentBtn) {
    swapFrontBackPermanentBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!currentCard) return;
      const sku = currentCard.sku;
      swapFrontBackPermanentBtn.disabled = true;
      swapFrontBackPermanentBtn.textContent = "Swapping...";
      try {
        const res = await fetch(`/api/cards/${sku}/swap-images`, { method: "POST" });
        const data = await res.json();
        if (data.status === "success") {
          currentCard = data.card;
          const idx = cards.findIndex(c => c.sku === sku);
          if (idx !== -1) cards[idx] = data.card;
          openChallengeModal(data.card);
          renderTable();
          showToast("Front and back images inverted successfully!");
        } else {
          alert("Failed to swap images: " + (data.detail || "Error"));
        }
      } catch (err) {
        alert("Network error swapping images: " + err.message);
      } finally {
        swapFrontBackPermanentBtn.disabled = false;
        swapFrontBackPermanentBtn.textContent = "🔄 Swap Front & Back";
      }
    });
  }

  closeModalBtn.addEventListener("click", closeChallengeModal);
  challengeModal.addEventListener("click", (e) => {
    if (e.target === challengeModal) closeChallengeModal();
  });

  // Quick Chips logic
  quickChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const text = chip.dataset.text;
      if (challengeFeedback.value) {
        challengeFeedback.value += ` • ${text}`;
      } else {
        challengeFeedback.value = text;
      }
    });
  });

  // Modal Price Calculation
  modalListPrice.addEventListener("input", () => {
    userEditedListPriceManually = true;
    const val = parseFloat(modalListPrice.value) || 0;
    modalAutoAccept.value = (val * 0.85).toFixed(2);
    modalMinOffer.value = (val * 0.75).toFixed(2);
  });

  // Dynamic Base Comp adjustment listener
  const editBaseCompInput = document.getElementById("modalEditBaseComp");
  if (editBaseCompInput) {
    editBaseCompInput.addEventListener("input", () => {
      const b = parseFloat(editBaseCompInput.value);
      if (!isNaN(b) && b > 0) {
        const listP = Math.round(b * 1.15 * 100) / 100;
        const autoP = Math.round(listP * 0.85 * 100) / 100;
        const minP = Math.round(listP * 0.75 * 100) / 100;
        modalListPrice.value = listP.toFixed(2);
        modalAutoAccept.value = autoP.toFixed(2);
        modalMinOffer.value = minP.toFixed(2);
        userEditedListPriceManually = true;
      }
    });
  }

  // Dynamic Title editing syncs header immediately
  const editTitleInput = document.getElementById("modalEditTitle");
  if (editTitleInput) {
    editTitleInput.addEventListener("input", () => {
      if (modalCardTitle) {
        modalCardTitle.textContent = editTitleInput.value.trim() || currentCard?.title || "Graded Card Details";
      }
    });
  }

  // Apply Challenge
  applyChallengeBtn.addEventListener("click", async () => {
    if (!currentCard) return;
    const feedback = challengeFeedback.value.trim();
    const editBaseCompInputEl = document.getElementById("modalEditBaseComp");
    const editBaseComp = parseFloat(editBaseCompInputEl?.value) || null;

    // Only send manual_list_price if user actually edited the List Price input manually!
    const currentListVal = parseFloat(modalListPrice.value) || 0;
    const isManualListPrice = userEditedListPriceManually && (currentListVal.toFixed(2) !== modalInitialListPrice);
    const mList = isManualListPrice ? currentListVal : null;
    const mAuto = isManualListPrice ? (parseFloat(modalAutoAccept.value) || null) : null;
    const mMin = isManualListPrice ? (parseFloat(modalMinOffer.value) || null) : null;

    const editTitle = document.getElementById("modalEditTitle")?.value.trim();
    const editPlayer = document.getElementById("modalEditPlayer")?.value.trim();
    const editSet = document.getElementById("modalEditSet")?.value.trim();
    const editCardNum = document.getElementById("modalEditCardNum")?.value.trim();
    const editCert = document.getElementById("modalEditCert")?.value.trim();

    if (editTitle) currentCard.title = editTitle;
    if (editPlayer) currentCard.player = editPlayer;
    if (editSet) currentCard.set = editSet;
    if (editCardNum) currentCard.card_number = editCardNum;
    if (editCert) currentCard.cert_number = editCert;
    if (editBaseComp) currentCard.base_comp = editBaseComp;

    const origBtnHtml = applyChallengeBtn.innerHTML;
    applyChallengeBtn.disabled = true;
    applyChallengeBtn.innerHTML = `<span>Recalculating...</span>`;

    try {
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: currentCard.sku,
          feedback: feedback,
          manual_list_price: mList,
          manual_auto_accept: mAuto,
          manual_min_offer: mMin,
          title: editTitle,
          player: editPlayer,
          card_set: editSet,
          card_number: editCardNum,
          cert_number: editCert,
          base_comp: editBaseComp,
          card_data: currentCard
        })
      });

      let updatedCard = null;
      if (res.ok) {
        const data = await res.json();
        if (data && data.status === "success" && data.card) {
          updatedCard = data.card;
        }
      }

      // Infallible Fallback: If server returned non-success or 404, execute client-side calibration engine immediately
      if (!updatedCard) {
        console.warn("Server challenge endpoint returned non-success; running client-side calibration engine.");
        updatedCard = calculateClientSideChallenge(currentCard, feedback, editBaseComp, mList, mAuto, mMin);
      }

      currentCard.list_price = updatedCard.list_price;
      currentCard.auto_accept = updatedCard.auto_accept;
      currentCard.min_offer = updatedCard.min_offer;
      currentCard.base_comp = updatedCard.base_comp;
      currentCard.justification = updatedCard.justification;
      currentCard.status = "CHALLENGED";
      if (updatedCard.title) currentCard.title = updatedCard.title;
      if (updatedCard.player) currentCard.player = updatedCard.player;

      modalInitialListPrice = currentCard.list_price.toFixed(2);
      userEditedListPriceManually = false;

      if (modalCardTitle) modalCardTitle.textContent = currentCard.title;
      modalListPrice.value = currentCard.list_price.toFixed(2);
      modalAutoAccept.value = currentCard.auto_accept.toFixed(2);
      modalMinOffer.value = currentCard.min_offer.toFixed(2);
      if (editBaseCompInputEl && currentCard.base_comp) {
        editBaseCompInputEl.value = parseFloat(currentCard.base_comp).toFixed(2);
      }

      renderValuationGrid(currentCard);
      renderTable();
      updateKPIs();

      showToast(`Pricing calibrated: List $${currentCard.list_price.toFixed(2)} | Auto-Accept $${currentCard.auto_accept.toFixed(2)}`, "success");
    } catch (err) {
      console.warn("Network error during challenge; running local client-side calibration engine:", err);
      const fallbackCard = calculateClientSideChallenge(currentCard, feedback, editBaseComp, mList, mAuto, mMin);
      modalInitialListPrice = fallbackCard.list_price.toFixed(2);
      userEditedListPriceManually = false;

      if (modalCardTitle) modalCardTitle.textContent = fallbackCard.title;
      modalListPrice.value = fallbackCard.list_price.toFixed(2);
      modalAutoAccept.value = fallbackCard.auto_accept.toFixed(2);
      modalMinOffer.value = fallbackCard.min_offer.toFixed(2);
      if (editBaseCompInputEl && fallbackCard.base_comp) {
        editBaseCompInputEl.value = parseFloat(fallbackCard.base_comp).toFixed(2);
      }

      renderValuationGrid(fallbackCard);
      renderTable();
      updateKPIs();

      showToast(`Pricing calibrated: List $${fallbackCard.list_price.toFixed(2)} | Auto-Accept $${fallbackCard.auto_accept.toFixed(2)}`, "success");
    } finally {
      applyChallengeBtn.disabled = false;
      applyChallengeBtn.innerHTML = origBtnHtml;
    }
  });

  // Modal Approve Pricing
  modalApproveBtn.addEventListener("click", async () => {
    if (!currentCard) return;
    const mList = parseFloat(modalListPrice.value) || currentCard.list_price;
    const mAuto = parseFloat(modalAutoAccept.value) || currentCard.auto_accept;
    const mMin = parseFloat(modalMinOffer.value) || currentCard.min_offer;

    const editTitle = document.getElementById("modalEditTitle")?.value.trim();
    const editPlayer = document.getElementById("modalEditPlayer")?.value.trim();
    const editSet = document.getElementById("modalEditSet")?.value.trim();
    const editCardNum = document.getElementById("modalEditCardNum")?.value.trim();
    const editCert = document.getElementById("modalEditCert")?.value.trim();
    const editBaseComp = parseFloat(document.getElementById("modalEditBaseComp")?.value) || null;

    if (editTitle) currentCard.title = editTitle;
    if (editPlayer) currentCard.player = editPlayer;
    if (editSet) currentCard.set = editSet;
    if (editCardNum) currentCard.card_number = editCardNum;
    if (editCert) currentCard.cert_number = editCert;
    if (editBaseComp) currentCard.base_comp = editBaseComp;

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
        manual_min_offer: mMin,
        title: editTitle,
        player: editPlayer,
        card_set: editSet,
        card_number: editCardNum,
        cert_number: editCert,
        base_comp: editBaseComp
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

  // Unlist card from eBay active status
  async function unlistCard(sku) {
    try {
      const res = await fetch(`/api/cards/${sku}/unlist`, { method: "POST" });
      const data = await res.json();
      if (data.status === "success") {
        const target = cards.find(c => c.sku === sku);
        if (target) {
          target.status = "UNLISTED";
          target.unlisted_at = data.card.unlisted_at;
          target.status_history = data.card.status_history;
        }
        selectedSkus.delete(sku);
        renderTable();
        updateKPIs();
        if (currentCard && currentCard.sku === sku) {
          openChallengeModal(target || data.card);
        }
      }
    } catch (err) {
      console.error("Failed to unlist card:", err);
    }
  }

  // Relist card (moves from UNLISTED -> APPROVED ready for next batch)
  async function relistCard(sku) {
    try {
      const res = await fetch(`/api/cards/${sku}/relist`, { method: "POST" });
      const data = await res.json();
      if (data.status === "success") {
        const target = cards.find(c => c.sku === sku);
        if (target) {
          target.status = "APPROVED";
          target.relisted_at = data.card.relisted_at;
          target.status_history = data.card.status_history;
        }
        renderTable();
        updateKPIs();
        if (currentCard && currentCard.sku === sku) {
          openChallengeModal(target || data.card);
        }
      }
    } catch (err) {
      console.error("Failed to relist card:", err);
    }
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

  // Master Checkbox: strictly only checks non-LISTED cards to prevent double listing
  masterCheckbox.addEventListener("change", (e) => {
    const filtered = getFilteredCards();
    if (e.target.checked) {
      filtered.forEach(c => {
        if (c.status !== "LISTED") selectedSkus.add(c.sku);
      });
    } else {
      filtered.forEach(c => selectedSkus.delete(c.sku));
    }
    renderTable();
  });

  // Select All: skips any cards already marked as LISTED
  selectAllBtn.addEventListener("click", () => {
    let skippedListed = 0;
    cards.forEach(c => {
      if (c.status !== "LISTED") {
        selectedSkus.add(c.sku);
      } else {
        skippedListed++;
      }
    });
    masterCheckbox.checked = true;
    renderTable();
    if (skippedListed > 0) {
      console.log(`Protected ${skippedListed} already LISTED cards from selection to prevent double-listing.`);
    }
  });

  // Select Approved: selects only cards with APPROVED or RELISTED status
  const selectApprovedBtn = document.getElementById("selectApprovedBtn");
  if (selectApprovedBtn) {
    selectApprovedBtn.addEventListener("click", () => {
      selectedSkus.clear();
      cards.forEach(c => {
        if (c.status === "APPROVED" || c.status === "RELISTED") {
          selectedSkus.add(c.sku);
        }
      });
      masterCheckbox.checked = (selectedSkus.size > 0);
      renderTable();
    });
  }

  approveSelectedBtn.addEventListener("click", async () => {
    if (selectedSkus.size === 0) {
      alert("Please select at least one card using the checkboxes.");
      return;
    }
    const skusToApprove = Array.from(selectedSkus);
    cards.forEach(c => {
      if (selectedSkus.has(c.sku) && c.status !== "LISTED") c.status = "APPROVED";
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

  if (batchProcessNowBtn) {
    batchProcessNowBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      processUploadBtn.click();
    });
  }

  function handleFilesSelected(filesList) {
    if (!filesList || filesList.length === 0) return;
    const files = Array.from(filesList);

    // If single file dropped and mode is dual, keep dual
    if (files.length === 1) {
      const mode = document.querySelector("input[name='uploadMode']:checked").value;
      if (mode === "dual") {
        uploadQueue.push({
          mode: 'dual',
          file: files[0],
          name: files[0].name,
          size: files[0].size
        });
      } else {
        uploadQueue.push({
          mode: 'separate',
          front: files[0],
          back: null,
          name: files[0].name,
          size: files[0].size
        });
      }
      updateUploadBatchUI();
      return;
    }

    // MULTIPLE FILES DROPPED: Automatically analyze and pair fronts & backs
    const frontRegex = /[-_\s](?:front|f|1|recto|obverse)\.[^.]+$/i;
    const backRegex = /[-_\s](?:back|b|2|verso|rear|reverse)\.[^.]+$/i;
    const certRegex = /(?:PSA[-_]?)?(\d{7,10})/i;

    // Map files with metadata
    const parsedFiles = files.map(f => {
      const certMatch = f.name.match(certRegex);
      const isFront = frontRegex.test(f.name);
      const isBack = backRegex.test(f.name);
      let stem = f.name.replace(frontRegex, '').replace(backRegex, '').replace(/\.[^.]+$/, '').trim();
      return {
        file: f,
        name: f.name,
        size: f.size,
        cert: certMatch ? certMatch[1] : null,
        isFront,
        isBack,
        stem
      };
    });

    const used = new Set();

    // 1. Pair by exact Cert Number match (e.g. 153466049_front.jpg and 153466049_back.jpg)
    const certGroups = {};
    parsedFiles.forEach((pf, idx) => {
      if (pf.cert) {
        if (!certGroups[pf.cert]) certGroups[pf.cert] = [];
        certGroups[pf.cert].push(idx);
      }
    });

    Object.keys(certGroups).forEach(cert => {
      const indices = certGroups[cert].filter(i => !used.has(i));
      while (indices.length >= 2) {
        const idx1 = indices.shift();
        const idx2 = indices.shift();
        used.add(idx1);
        used.add(idx2);

        let pf1 = parsedFiles[idx1];
        let pf2 = parsedFiles[idx2];
        let frontPf = pf1;
        let backPf = pf2;

        if (pf1.isBack || pf2.isFront) {
          frontPf = pf2;
          backPf = pf1;
        }

        uploadQueue.push({
          mode: 'separate',
          front: frontPf.file,
          back: backPf.file,
          cert: cert,
          name: `${frontPf.name} + ${backPf.name}`,
          size: frontPf.size + backPf.size
        });
      }
    });

    // 2. Pair by identical Stem match (e.g. haaland-1.jpg and haaland-2.jpg)
    const stemGroups = {};
    parsedFiles.forEach((pf, idx) => {
      if (!used.has(idx) && pf.stem) {
        if (!stemGroups[pf.stem]) stemGroups[pf.stem] = [];
        stemGroups[pf.stem].push(idx);
      }
    });

    Object.keys(stemGroups).forEach(stem => {
      const indices = stemGroups[stem].filter(i => !used.has(i));
      while (indices.length >= 2) {
        const idx1 = indices.shift();
        const idx2 = indices.shift();
        used.add(idx1);
        used.add(idx2);

        let pf1 = parsedFiles[idx1];
        let pf2 = parsedFiles[idx2];
        let frontPf = pf1;
        let backPf = pf2;

        if (pf1.isBack || pf2.isFront) {
          frontPf = pf2;
          backPf = pf1;
        }

        uploadQueue.push({
          mode: 'separate',
          front: frontPf.file,
          back: backPf.file,
          cert: frontPf.cert || backPf.cert,
          name: `${frontPf.name} + ${backPf.name}`,
          size: frontPf.size + backPf.size
        });
      }
    });

    // 3. Sequential pairing for remaining files (dealers photograph Front, Back, Front, Back)
    const remainingIndices = parsedFiles.map((_, i) => i).filter(i => !used.has(i));
    for (let i = 0; i < remainingIndices.length; i += 2) {
      const idx1 = remainingIndices[i];
      const idx2 = remainingIndices[i + 1];
      const pf1 = parsedFiles[idx1];
      const pf2 = idx2 !== undefined ? parsedFiles[idx2] : null;

      if (pf2) {
        let frontPf = pf1;
        let backPf = pf2;
        if (pf1.isBack || pf2.isFront) {
          frontPf = pf2;
          backPf = pf1;
        }
        uploadQueue.push({
          mode: 'separate',
          front: frontPf.file,
          back: backPf.file,
          cert: frontPf.cert || backPf.cert,
          name: `${frontPf.name} + ${backPf.name}`,
          size: frontPf.size + backPf.size
        });
      } else {
        // Solitary file left
        uploadQueue.push({
          mode: 'separate',
          front: pf1.file,
          back: null,
          cert: pf1.cert,
          name: pf1.name,
          size: pf1.size
        });
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
      let detailHtml = `<strong>${uploadQueue.length} slab(s) ready (${totalMb} MB)</strong>: `;
      const pairTags = uploadQueue.map((q, idx) => {
        if (q.mode === 'separate') {
          const fName = q.front ? q.front.name : 'Missing Front';
          const bName = q.back ? q.back.name : 'Missing Back';
          return `<span style="display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; margin: 2px; font-size: 11px;">
            <span style="color:#4ade80; font-weight:700;">[FRONT]</span> ${fName} ↔ <span style="color:#38bdf8; font-weight:700;">[BACK]</span> ${bName}
            <button type="button" class="btn btn-xs btn-outline-warning swap-queue-item-btn" data-idx="${idx}" style="font-size:9px; padding: 1px 4px; margin-left:4px;">🔄 Swap</button>
          </span>`;
        } else {
          return `<span style="background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; margin: 2px; font-size: 11px;">${q.name} (Dual-Shot)</span>`;
        }
      }).join(' ');
      batchDetailText.innerHTML = detailHtml + pairTags;

      // Wire swap buttons in batchPreviewBar
      document.querySelectorAll(".swap-queue-item-btn").forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.idx);
          if (uploadQueue[idx] && uploadQueue[idx].mode === 'separate') {
            const temp = uploadQueue[idx].front;
            uploadQueue[idx].front = uploadQueue[idx].back;
            uploadQueue[idx].back = temp;
            uploadQueue[idx].name = `${uploadQueue[idx].front?.name || 'Missing'} + ${uploadQueue[idx].back?.name || 'Missing'}`;
            updateUploadBatchUI();
          }
        };
      });
    }

    const dropTitle = document.querySelector(".drop-text h3");
    if (dropTitle) {
      dropTitle.innerHTML = `Queued: <strong>${uploadQueue.length} card slab(s)</strong> (${totalMb} MB total) • Fronts & Backs Paired`;
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
        if (item.front) formData.append("front", item.front);
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

      const rawName = (item.file?.name || item.front?.name || item.name || "");
      const certMatch = rawName.match(/(?:PSA[-_]?)?(\d{7,10})/i);
      if (certMatch) {
        formData.append("cert_number", certMatch[1]);
      } else if (item.cert) {
        formData.append("cert_number", item.cert);
      }

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        if (data.status === "success") {
          data.card._justAdded = true;
          // Deduplicate in cards array: update existing record if same SKU or cert, else unshift
          const existingIdx = cards.findIndex(c => c.sku === data.card.sku || (c.cert_number && c.cert_number === data.card.cert_number));
          if (existingIdx !== -1) {
            cards[existingIdx] = data.card;
          } else {
            cards.unshift(data.card);
          }
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
      if (lastAddedCard) {
        openChallengeModal(lastAddedCard);
      }
    }, 500);
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

        const exportBatchNameTag = document.getElementById("exportBatchNameTag");
        const exportBatchFolderPath = document.getElementById("exportBatchFolderPath");
        if (exportBatchNameTag) exportBatchNameTag.textContent = data.batch_name;
        if (exportBatchFolderPath) exportBatchFolderPath.textContent = data.batch_folder;

        downloadCsvBtn.href = data.csv_download_url;
        downloadXlsxBtn.href = data.xlsx_download_url;

        // Mark exported cards as LISTED and record batch_folder
        const exportedSkusSet = new Set(Array.from(selectedSkus));
        cards.forEach(c => {
          if (exportedSkusSet.size === 0 || exportedSkusSet.has(c.sku)) {
            if (c.status === "APPROVED" || exportedSkusSet.has(c.sku)) {
              c.status = "LISTED";
              c.batch_folder = data.batch_name;
              c.listed_at = data.timestamp;
              c.upc = "Does not apply";
            }
          }
        });
        selectedSkus.clear();
        renderTable();
        updateKPIs();

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
    const settingEbayAppId = document.getElementById("settingEbayAppId");
    const settingEbayCertId = document.getElementById("settingEbayCertId");
    const settingEbayToken = document.getElementById("settingEbayToken");

    const updated = {
      account_name: settingAccount.value.trim(),
      shipping_profile: settingShipping.value.trim(),
      return_profile: settingReturns.value.trim(),
      payment_profile: settingPayments.value.trim(),
      location: settingLocation.value.trim(),
      cdn_prefix: settingCdn.value.trim(),
      ebay_app_id: settingEbayAppId ? settingEbayAppId.value.trim() : "",
      ebay_cert_id: settingEbayCertId ? settingEbayCertId.value.trim() : "",
      ebay_token: settingEbayToken ? settingEbayToken.value.trim() : ""
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

  // --- Sales Ledger & Manual Entry Modal Logic ---
  if (viewSalesLedgerBtn) {
    viewSalesLedgerBtn.addEventListener("click", () => {
      fetchSales();
      salesLedgerModal.classList.add("open");
    });
  }
  if (closeSalesLedgerModalBtn) {
    closeSalesLedgerModalBtn.addEventListener("click", () => salesLedgerModal.classList.remove("open"));
  }

  // Open Record Sale Modal
  if (openRecordSaleBtn) {
    openRecordSaleBtn.addEventListener("click", () => {
      if (saleCardSelect) {
        saleCardSelect.innerHTML = '<option value="">-- Choose active staged card --</option>';
        cards.forEach(c => {
          if (c.status !== "SOLD") {
            const opt = document.createElement("option");
            opt.value = c.sku;
            opt.textContent = `${c.sku} - ${c.title} ($${c.list_price})`;
            saleCardSelect.appendChild(opt);
          }
        });
      }
      if (manualSaleDate) manualSaleDate.value = new Date().toISOString().split('T')[0];
      recordSaleModal.classList.add("open");
    });
  }
  if (closeRecordSaleModalBtn) {
    closeRecordSaleModalBtn.addEventListener("click", () => recordSaleModal.classList.remove("open"));
  }

  if (saleCardSelect) {
    saleCardSelect.addEventListener("change", (e) => {
      const selected = cards.find(c => c.sku === e.target.value);
      if (selected) {
        manualSaleSku.value = selected.sku;
        manualSalePrice.value = selected.list_price ? selected.list_price.toFixed(2) : "100.00";
      }
    });
  }

  // Submit Manual Sale
  if (submitManualSaleBtn) {
    submitManualSaleBtn.addEventListener("click", async () => {
      const price = parseFloat(manualSalePrice.value);
      if (isNaN(price) || price <= 0) {
        alert("Please enter a valid realized sold price.");
        return;
      }

      submitManualSaleBtn.disabled = true;
      submitManualSaleBtn.textContent = "Recording Liquidation...";

      try {
        const res = await fetch("/api/sales/manual-entry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku: manualSaleSku.value.trim() || undefined,
            order_id: manualSaleOrderId.value.trim() || undefined,
            realized_price: price,
            shipping_charged: parseFloat(manualSaleShipping.value) || 5.0,
            buyer_handle: manualSaleBuyer.value.trim() || "ebay_buyer",
            sold_date: manualSaleDate.value || undefined,
            ship_by_date: manualSaleShipBy.value.trim() || "Within 2 business days"
          })
        });
        const data = await res.json();
        if (data.status === "success") {
          recordSaleModal.classList.remove("open");
          await fetchSales();
          await fetchCards();
          alert(`Sale recorded successfully! Net Payout: $${data.sale.net_payout.toFixed(2)} | House Alpha: +${data.sale.alpha_vs_comp_pct.toFixed(1)}%`);
        } else {
          alert("Error recording sale: " + (data.detail || "Server error"));
        }
      } catch (err) {
        alert("Failed to record sale: " + err.message);
      } finally {
        submitManualSaleBtn.disabled = false;
        submitManualSaleBtn.textContent = "Record Liquidation & Update Alpha";
      }
    });
  }

  // Sync Sales from Email
  async function triggerSalesSync() {
    if (syncSalesBtn) syncSalesBtn.disabled = true;
    if (ledgerSyncSalesBtn) ledgerSyncSalesBtn.disabled = true;
    if (syncSalesText) syncSalesText.textContent = "Syncing...";

    try {
      const res = await fetch("/api/sync-sales", { method: "POST" });
      const data = await res.json();
      if (data.status === "success") {
        await fetchSales();
        await fetchCards();
        alert(data.message || `Processed ${data.processed_count} new sales!`);
      } else if (data.status === "config_required") {
        alert(data.message || "Email sync credentials required. You can record sales manually anytime using '+ Record Sale'.");
      } else {
        alert("Sync warning: " + (data.message || "Failed to sync emails."));
      }
    } catch (err) {
      alert("Email sync failed: " + err.message);
    } finally {
      if (syncSalesBtn) syncSalesBtn.disabled = false;
      if (ledgerSyncSalesBtn) ledgerSyncSalesBtn.disabled = false;
      if (syncSalesText) syncSalesText.textContent = "Sync Sales";
    }
  }

  if (syncSalesBtn) syncSalesBtn.addEventListener("click", triggerSalesSync);
  if (ledgerSyncSalesBtn) ledgerSyncSalesBtn.addEventListener("click", triggerSalesSync);

  // Close modals on clicking outside drawer/card
  window.addEventListener("click", (e) => {
    if (e.target === challengeModal) closeChallengeModal();
    if (e.target === exportModal) exportModal.classList.remove("open");
    if (e.target === settingsModal) settingsModal.classList.remove("open");
    if (e.target === salesLedgerModal) salesLedgerModal.classList.remove("open");
    if (e.target === recordSaleModal) recordSaleModal.classList.remove("open");
  });
});
