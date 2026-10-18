(function () {
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalGetItem = localStorage.getItem.bind(localStorage);
  let syncing = false;

  function parse(value, fallback) {
    try { const result = JSON.parse(value); return result == null ? fallback : result; }
    catch { return fallback; }
  }

  function currentAccount() {
    const account = parse(originalGetItem("hpAccount"), null);
    if (account) return account;
    const email = originalGetItem("currentUserEmail");
    const users = parse(originalGetItem("happyPawsUsers"), []);
    return Array.isArray(users) ? users.find(user => user.email === email) || {} : {};
  }

  function normalizePets(value) {
    const account = currentAccount();
    const rows = Array.isArray(value) ? value : [];
    return rows.map(pet => ({
      ...pet,
      id: pet.id == null ? String(Date.now()) : pet.id,
      name: pet.name || pet.petName || "",
      petName: pet.petName || pet.name || "",
      type: pet.type || pet.petType || "",
      petType: pet.petType || pet.type || "",
      birth: pet.birth || pet.dob || pet.dateOfBirth || "",
      dob: pet.dob || pet.birth || pet.dateOfBirth || "",
      ownerName: pet.ownerName || account.name || [account.firstName, account.lastName].filter(Boolean).join(" "),
      ownerEmail: pet.ownerEmail || account.email || ""
    }));
  }

  function normalizeAppointments(value) {
    const account = currentAccount();
    return (Array.isArray(value) ? value : []).map(item => ({
      ...item,
      pet: item.pet || item.petName || "",
      petName: item.petName || item.pet || "",
      ownerName: item.ownerName || account.name || [account.firstName, account.lastName].filter(Boolean).join(" "),
      ownerEmail: item.ownerEmail || account.email || "",
      status: item.status || "Pending"
    }));
  }

  function normalizeConsultations(value) {
    const account = currentAccount();
    return (Array.isArray(value) ? value : []).map(item => ({
      ...item,
      pet: item.pet || item.petName || "",
      petName: item.petName || item.pet || "",
      ownerName: item.ownerName || account.name || [account.firstName, account.lastName].filter(Boolean).join(" "),
      ownerEmail: item.ownerEmail || account.email || "",
      concern: item.concern || item.diagnosis || item.notes || "",
      diagnosis: item.diagnosis || item.concern || item.notes || "",
      type: item.type || item.consultationType || "Consultation",
      date: item.date || item.consultationDate || new Date().toISOString().slice(0, 10),
      status: item.status || "Pending"
    }));
  }

  function syncArrayPair(key, value) {
    let targetKeys = null, normalized = value;
    if (key === "hpPets" || key === "happyPawsPets") {
      targetKeys = ["hpPets", "happyPawsPets"];
      normalized = normalizePets(parse(value, []));
    } else if (key === "hpAppointments" || key === "happyPawsAppointments") {
      targetKeys = ["hpAppointments", "happyPawsAppointments"];
      normalized = normalizeAppointments(parse(value, []));
    } else if (key === "hpConsultations" || key === "happyPawsConsultations") {
      targetKeys = ["hpConsultations", "happyPawsConsultations"];
      normalized = normalizeConsultations(parse(value, []));
    } else if (key === "hpServices" || key === "happyPawsServices") {
      targetKeys = ["hpServices", "happyPawsServices"];
      normalized = Array.isArray(parse(value, [])) ? parse(value, []) : [];
    }
    if (!targetKeys) return false;
    const text = JSON.stringify(normalized);
    syncing = true;
    try { targetKeys.forEach(target => { if (originalGetItem(target) !== text) originalSetItem(target, text); }); }
    finally { syncing = false; }
    return true;
  }

  function syncAccount(key, value) {
    if (key === "hpAccount") {
      const account = parse(value, null);
      if (!account || !account.email) return;
      const users = parse(originalGetItem("happyPawsUsers"), []);
      if (!Array.isArray(users)) return;
      const email = String(account.email).trim().toLowerCase();
      const index = users.findIndex(user => String(user.email || "").toLowerCase() === email);
      const old = index >= 0 ? users[index] : {};
      const fullName = account.name || [account.firstName, account.lastName].filter(Boolean).join(" ");
      const parts = String(fullName || "").trim().split(/\s+/);
      const updated = { ...old, ...account, id: old.id || account.id || String(Date.now()), name: fullName, firstName: account.firstName || parts[0] || "", lastName: account.lastName || parts.slice(1).join(" "), email, owner: old.owner || {}, pets: Array.isArray(old.pets) ? old.pets : [] };
      if (index >= 0) users[index] = updated; else users.push(updated);
      syncing = true;
      try {
        originalSetItem("happyPawsUsers", JSON.stringify(users));
        originalSetItem("currentUserEmail", email);
      } finally { syncing = false; }
      return true;
    }
    if (key === "happyPawsUsers") {
      const users = parse(value, []);
      const email = originalGetItem("currentUserEmail") || (parse(originalGetItem("hpAccount"), {}) || {}).email;
      if (!Array.isArray(users) || !email) return false;
      const user = users.find(item => String(item.email || "").toLowerCase() === String(email).toLowerCase());
      if (user) {
        const account = { name: user.name || [user.firstName, user.lastName].filter(Boolean).join(" "), firstName: user.firstName || "", lastName: user.lastName || "", email: user.email, phone: user.phone || "" };
        syncing = true;
        try { originalSetItem("hpAccount", JSON.stringify(account)); }
        finally { syncing = false; }
      }
      return true;
    }
    return false;
  }

  localStorage.setItem = function (key, value) {
    originalSetItem(key, value);
    if (syncing) return;
    if (syncArrayPair(key, value)) return;
    syncAccount(key, value);
  };

  window.addEventListener("storage", function (event) {
    if (!event.key || event.newValue == null || syncing) return;
    if (["hpPets", "happyPawsPets", "hpAppointments", "happyPawsAppointments", "hpConsultations", "happyPawsConsultations", "hpServices", "happyPawsServices"].includes(event.key)) {
      syncArrayPair(event.key, event.newValue);
    } else if (event.key === "hpAccount" || event.key === "happyPawsUsers") {
      syncAccount(event.key, event.newValue);
    }
  });

  function seedPair(a, b) {
    const av = originalGetItem(a), bv = originalGetItem(b);
    if (av == null && bv != null) syncArrayPair(b, bv);
    else if (bv == null && av != null) syncArrayPair(a, av);
    else if (av != null && bv != null) {
      const parsedA = parse(av, []), parsedB = parse(bv, []);
      if (Array.isArray(parsedA) && Array.isArray(parsedB)) {
        const combined = [...parsedA];
        const seen = new Set(combined.map(item => String(item.id ?? JSON.stringify(item))));
        parsedB.forEach(item => { const id = String(item.id ?? JSON.stringify(item)); if (!seen.has(id)) { combined.push(item); seen.add(id); } });
        syncArrayPair(a, JSON.stringify(combined));
      }
    }
  }

  [["hpPets", "happyPawsPets"], ["hpAppointments", "happyPawsAppointments"], ["hpConsultations", "happyPawsConsultations"], ["hpServices", "happyPawsServices"]].forEach(pair => seedPair(pair[0], pair[1]));
  const email = originalGetItem("currentUserEmail");
  const users = parse(originalGetItem("happyPawsUsers"), []);
  if (email && Array.isArray(users)) {
    const user = users.find(item => String(item.email || "").toLowerCase() === String(email).toLowerCase());
    if (user && !originalGetItem("hpAccount")) {
      originalSetItem("hpAccount", JSON.stringify({ name: user.name || [user.firstName, user.lastName].filter(Boolean).join(" "), firstName: user.firstName || "", lastName: user.lastName || "", email: user.email, phone: user.phone || "" }));
    }
  }
})();
