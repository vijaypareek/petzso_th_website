(function () {
  const API_BASE = "https://app.petzso.com/api";
  //const API_BASE = "http://localhost:4000/api";
  const WEBSITE_URL = "https://www.petzso.com";

  const state = {
    token: null,
    payload: null,
  };

  const $ = (id) => document.getElementById(id);

  function getEl(id) {
    return document.getElementById(id);
  }

  function getValue(id) {
    const el = getEl(id);
    return el ? String(el.value || "").trim() : "";
  }

  function setValue(id, value) {
    const el = getEl(id);
    if (!el) return;
    el.value = value || "";
  }

  function setText(id, value, fallback = "—") {
    const el = getEl(id);
    if (!el) return;
    el.textContent = value || fallback;
  }

  function show(id) {
    const el = getEl(id);
    if (!el) return;
    el.classList.remove("hidden");
  }

  function hide(id) {
    const el = getEl(id);
    if (!el) return;
    el.classList.add("hidden");
  }

  function showError(message) {
    const el = $("pageError");
    if (!el) return;

    el.textContent = message || "Something went wrong.";
    el.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function hideError() {
    const el = $("pageError");
    if (!el) return;

    el.style.display = "none";
    el.textContent = "";
  }

  function showSuccessMessage(message) {
    const el = $("formSuccess");
    if (!el) return;

    el.textContent = message || "Saved successfully.";
    el.style.display = "block";
  }

  function hideSuccessMessage() {
    const el = $("formSuccess");
    if (!el) return;

    el.style.display = "none";
    el.textContent = "";
  }

  function setLoading(isLoading) {
    const loadingState = $("loadingState");
    const claimApp = $("claimApp");

    if (loadingState) loadingState.classList.toggle("hidden", !isLoading);
    if (claimApp) claimApp.classList.toggle("hidden", isLoading);
  }

  function setButtonLoading(button, isLoading, loadingText) {
    if (!button) return;

    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent;
    }

    button.disabled = !!isLoading;
    button.textContent = isLoading
      ? loadingText || "Please wait..."
      : button.dataset.originalText;
  }

  function setFieldError(fieldId, errorElId, message) {
    const fieldEl = getEl(fieldId);
    const errorEl = getEl(errorElId);

    if (!fieldEl || !errorEl) return;

    if (message) {
      fieldEl.classList.add("invalid");
      errorEl.textContent = message;
      errorEl.classList.add("show");
    } else {
      fieldEl.classList.remove("invalid");
      errorEl.textContent = "";
      errorEl.classList.remove("show");
    }
  }

  function clearAllErrors() {
    setFieldError("name", "nameError", "");
    setFieldError("business_category", "businessCategoryError", "");
    setFieldError("phone", "phoneError", "");
    setFieldError("description", "descriptionError", "");

    setFieldError("address_line", "addressLineError", "");
    setFieldError("city", "cityError", "");
    setFieldError("state", "stateError", "");
    setFieldError("postal_code", "postalCodeError", "");
    setFieldError("landmark", "landmarkError", "");
    setFieldError("service_area", "serviceAreaError", "");

    setFieldError("whatsapp", "whatsappError", "");
    setFieldError("line", "lineError", "");
    setFieldError("instagram", "instagramError", "");
    setFieldError("website", "websiteError", "");

    setFieldError("claimant_name", "claimantNameError", "");
    setFieldError("claimant_phone", "claimantPhoneError", "");
    setFieldError("claimant_role", "claimantRoleError", "");
  }

  function isValidPhoneNumber(value) {
    if (!value) return false;
    const cleaned = value.replace(/[^\d+]/g, "");
    return /^\+?[0-9]{8,15}$/.test(cleaned);
  }

  function isValidUrl(value) {
    if (!value) return true;

    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  }

  function isValidLineUrl(value) {
    if (!value) return true;
    if (!isValidUrl(value)) return false;
    return /line\.me|lin\.ee/i.test(value);
  }

  function normalizeInstagram(value) {
    return String(value || "").trim().replace(/^@+/, "");
  }

  function isValidInstagramHandle(value) {
    if (!value) return true;
    const handle = normalizeInstagram(value);
    return /^[a-zA-Z0-9._]{1,30}$/.test(handle);
  }

  function getParams() {
    const params = new URLSearchParams(window.location.search);

    return {
      c: params.get("c"),
    };
  }

  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await res.text();

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_) {
      data = {};
    }

    if (!res.ok) {
      throw new Error(data.message || `Request failed (${res.status})`);
    }

    return data;
  }

  function businessMetaLine(data) {
    const parts = [];
    const biz = data?.business || {};
    const category = data?.category || {};

    if (category.name) parts.push(category.name);
    if (biz.city) parts.push(biz.city);

    return parts.join(" • ") || "Business listing";
  }

  function buildPreviewAddress(biz) {
    return [
      biz.address_line,
      biz.city,
      biz.state,
      biz.postal_code,
    ]
      .filter(Boolean)
      .join(", ") || "Address not added yet";
  }

  function isVenueLikeCategory(data) {
    const category = data?.category || {};
    const biz = data?.business || {};

    const type = String(category.type || biz.listing_type || "").toLowerCase();
    const name = String(category.name || "").toLowerCase();
    const groupKey = String(category.group_key || "").toLowerCase();

    return (
      type === "venue" ||
      groupKey.includes("venue") ||
      groupKey.includes("place") ||
      name.includes("cafe") ||
      name.includes("restaurant") ||
      name.includes("hotel") ||
      name.includes("park") ||
      name.includes("pool") ||
      name.includes("pet-friendly") ||
      name.includes("pet friendly")
    );
  }

  function fillBusinessPreview(data) {
    const biz = data.business || {};
    const category = data.category || {};

    const logo = $("bizLogo");
    if (logo) {
      logo.src =
        biz.logo_url ||
        "https://placehold.co/240x240/f3f4f6/9ca3af?text=PetzSo";
      logo.alt = biz.name ? `${biz.name} logo` : "Business logo";
    }

    setText("bizNamePreview", biz.name);
    setText("bizAddressPreview", buildPreviewAddress(biz), "Address not added yet");
    setText("bizMetaPreview", businessMetaLine(data), "Business listing");

    const typePill = $("bizTypePill");
    if (typePill) {
      typePill.textContent = category.name || biz.listing_type || "Business";
    }

    if (Number(biz.is_verified) === 1) {
      show("bizVerifiedPill");
    } else {
      hide("bizVerifiedPill");
    }
  }

  function fillForm(data) {
    const biz = data.business || {};
    const contacts = data.contacts || {};
    const venue = data.venue_details || {};
    const category = data.category || {};

    setValue("name", biz.name);
    setValue("business_category", category.name || biz.listing_type || "");
    setValue("phone", biz.phone);
    setValue("description", biz.description);

    setValue("address_line", biz.address_line);
    setValue("city", biz.city);
    setValue("state", biz.state);
    setValue("postal_code", biz.postal_code);
    setValue("landmark", biz.landmark);

    setValue("whatsapp", contacts.whatsapp);
    setValue("line", contacts.line);
    setValue("instagram", contacts.instagram);
    setValue("website", biz.website || "");

    setValue("pet_rules", venue.pet_rules);
    setValue("additional_info", venue.additional_info);

    const isVenue = isVenueLikeCategory(data);

   if (isVenue) {
  show("venueCard");
} else {
  hide("venueCard");
}

    renderImages(data.images || [], isVenue);
  }

  function renderImages(images, shouldShowImageSection) {
    const card = $("imagesCard");
    const grid = $("imagesGrid");

    if (!card || !grid) return;

    grid.innerHTML = "";

    if (!shouldShowImageSection) {
      card.classList.add("hidden");
      return;
    }

    if (!images.length) {
      const empty = document.createElement("div");
      empty.className = "notice";
      empty.textContent =
        "No current photos added yet. You can upload photos later from the PetzSo Partner app.";
      grid.appendChild(empty);
      card.classList.remove("hidden");
      return;
    }

    images.forEach((img) => {
      const item = document.createElement("div");
      item.className = "image-item";

      const image = document.createElement("img");
      image.src = img.image_url;
      image.alt = "Business image";

      item.appendChild(image);
      grid.appendChild(item);
    });

    card.classList.remove("hidden");
  }

  function applyClaimState(data) {
    const claim = data.claim || {};
    const confirmBtn = $("confirmBtn");

    if (!confirmBtn) return;

    if (claim.already_claimed) {
      show("alreadyClaimedNotice");
      hide("newClaimNotice");
      confirmBtn.textContent = "Submit Updates";
    } else if (claim.has_pending_update || claim.status === "submitted") {
      show("alreadyClaimedNotice");
      hide("newClaimNotice");
      confirmBtn.textContent = "Submit Updated Details";

      const notice = $("alreadyClaimedNotice");
      if (notice) {
        notice.textContent =
          "We already received an update for this listing. You can still submit corrected details again if needed.";
      }
    } else {
      hide("alreadyClaimedNotice");
      show("newClaimNotice");
      confirmBtn.textContent = "Submit Updates";
    }
  }

  function validateClaimForm() {
    clearAllErrors();

    let isValid = true;

    const name = getValue("name");
    const phone = getValue("phone");
    const whatsapp = getValue("whatsapp");
    const line = getValue("line");
    const instagram = getValue("instagram");
    const website = getValue("website");

    const claimantName = getValue("claimant_name");
    const claimantPhone = getValue("claimant_phone");
    const claimantRole = getValue("claimant_role");

    if (!name || name.length < 2) {
      setFieldError("name", "nameError", "Please enter a valid business name.");
      isValid = false;
    }

    /**
     * Keep this light:
     * business must have at least one usable public contact method.
     */
    const hasAnyContact = !!phone || !!whatsapp || !!line || !!instagram || !!website;

    if (!hasAnyContact) {
      setFieldError("phone", "phoneError", "Please add at least one contact method.");
      isValid = false;
    }

    if (phone && !isValidPhoneNumber(phone)) {
      setFieldError("phone", "phoneError", "Please enter a valid phone number.");
      isValid = false;
    }

    if (whatsapp && !isValidPhoneNumber(whatsapp)) {
      setFieldError("whatsapp", "whatsappError", "Please enter a valid WhatsApp number.");
      isValid = false;
    }

    if (line && !isValidLineUrl(line)) {
      setFieldError("line", "lineError", "Please enter a valid full LINE URL.");
      isValid = false;
    }

    if (instagram && !isValidInstagramHandle(instagram)) {
      setFieldError("instagram", "instagramError", "Please enter a valid Instagram handle.");
      isValid = false;
    }

    if (website && !isValidUrl(website)) {
      setFieldError("website", "websiteError", "Please enter a valid website URL.");
      isValid = false;
    }

    if (!claimantName || claimantName.length < 2) {
      setFieldError("claimant_name", "claimantNameError", "Please enter your name.");
      isValid = false;
    }

    if (!claimantPhone || !isValidPhoneNumber(claimantPhone)) {
      setFieldError(
        "claimant_phone",
        "claimantPhoneError",
        "Please enter a valid contact number."
      );
      isValid = false;
    }

    if (!claimantRole) {
      setFieldError(
        "claimant_role",
        "claimantRoleError",
        "Please select your relation with this business."
      );
      isValid = false;
    }

    if (instagram) {
      const instagramEl = $("instagram");
      if (instagramEl) instagramEl.value = "@" + normalizeInstagram(instagram);
    }

    return isValid;
  }

  function collectPayload() {
    const payload = {
      c: state.token,

      business_name: getValue("name"),
      business_category: getValue("business_category"),

      phone: getValue("phone"),
      whatsapp: getValue("whatsapp"),
      line_url: getValue("line"),
      instagram: getValue("instagram"),
      website: getValue("website"),

      description: getValue("description"),

      address_line: getValue("address_line"),
      city: getValue("city"),
      state: getValue("state"),
      postal_code: getValue("postal_code"),
      landmark: getValue("landmark"),
      service_area: getValue("service_area"),

      claimant_name: getValue("claimant_name"),
      claimant_phone: getValue("claimant_phone"),
      claimant_role: getValue("claimant_role"),
    };

    const venueCard = $("venueCard");
    if (venueCard && !venueCard.classList.contains("hidden")) {
      payload.pet_rules = getValue("pet_rules");
      payload.additional_info = getValue("additional_info");

      payload.venue_details = {
        pet_rules: payload.pet_rules,
        additional_info: payload.additional_info,
      };
    }

    /**
     * File inputs are intentionally not submitted yet.
     * Backend currently accepts JSON, not multipart upload.
     * Logo/photos should be added later via S3 presigned upload flow.
     */

    return payload;
  }

  async function loadClaimPage() {
    hideError();
    hideSuccessMessage();

    const { c } = getParams();
    state.token = c;

    if (!c) {
      setLoading(false);
      hide("claimApp");
      showError("This claim link is incomplete or invalid.");
      return;
    }

    try {
      const data = await api(
        `/business-claims/public/details?c=${encodeURIComponent(c)}`
      );

      state.payload = data;

      fillBusinessPreview(data);
      fillForm(data);
      applyClaimState(data);

      setLoading(false);
    } catch (err) {
      setLoading(false);
      hide("claimApp");
      showError(err.message || "Unable to load claim details.");
    }
  }

  function isIndiaBusiness() {
  const biz = state.payload?.business || {};

  const countryCode = String(biz.country_code || "")
    .trim()
    .toUpperCase();

  const phone = String(biz.phone || getValue("phone") || "").trim();
  const whatsapp = String(getValue("whatsapp") || "").trim();

  return (
    countryCode === "IN" ||
    countryCode === "IND" ||
    countryCode === "91" ||
    phone.startsWith("+91") ||
    whatsapp.startsWith("+91")
  );
}

function applySuccessContent() {
  const indiaOffers = $("indiaSuccessOffers");

  setText("successTitle", "Thanks, we’re reviewing your details", "");

  if (isIndiaBusiness()) {
    setText(
      "successDescription",
      "Once approved, your business details will go live in the PetzSo app.",
      ""
    );

    if (indiaOffers) {
      indiaOffers.classList.remove("hidden");
    }
  } else {
    setText(
      "successDescription",
      "Once approved, your updated business details will be shown on PetzSo.",
      ""
    );

    if (indiaOffers) {
      indiaOffers.classList.add("hidden");
    }
  }
}

  async function confirmClaim() {
    hideError();
    hideSuccessMessage();

    if (!state.token) {
      showError("Invalid claim link.");
      return;
    }

    const btn = $("confirmBtn");

    const isValid = validateClaimForm();
    if (!isValid) {
      showError("Please fix the highlighted fields before submitting.");
      return;
    }

    const payload = collectPayload();

    try {
      setButtonLoading(btn, true, "Submitting...");

      const res = await api(`/business-claims/public/confirm`, {
        method: "POST",
        body: payload,
      });

      showSuccessMessage(
        res.message ||
          "Thanks, we received your updates. Our team will review them before updating your PetzSo listing."
      );

      applySuccessContent();

        hide("claimApp");
        show("successScreen");

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      showError(err.message || "Failed to submit your updates.");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  function wireEvents() {
    const confirmBtn = $("confirmBtn");
    const viewSiteBtn = $("viewSiteBtn");
    const successVisitBtn = $("successVisitBtn");

    if (confirmBtn) {
      confirmBtn.addEventListener("click", confirmClaim);
    }

    if (viewSiteBtn) {
      viewSiteBtn.addEventListener("click", function () {
        window.open(WEBSITE_URL, "_blank", "noopener,noreferrer");
      });
    }

    if (successVisitBtn) {
      successVisitBtn.addEventListener("click", function () {
        window.open(WEBSITE_URL, "_blank", "noopener,noreferrer");
      });
    }
  }

  wireEvents();
  loadClaimPage();
})();