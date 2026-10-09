document.addEventListener("DOMContentLoaded", function() {
  const sidebarContainer = document.getElementById('sidebar-container');
  if (!sidebarContainer) return;

  // Kunin ang kasalukuyang pahina mula sa URL
  const currentPage = window.location.pathname.split("/").pop() || "dashboard.html";

  // Listahan ng lahat ng menu at ang kanilang HTML files
  const menuItems = [
    { name: "🏠 Dashboard", file: "dashboard.html" },
    { name: "🐾 Pet Records", file: "records.html" },
    { name: "👤 Owners", file: "owners.html" },
    { name: "📅 Appointments", file: "appointments.html" },
    { name: "🩺 Consultations", file: "consultations.html" },
    { name: "📋 Services", file: "services.html" },
    { name: "💊 Medicines", file: "medicines.html" },
    { name: "💳 Billing", file: "billing.html" },
    { name: "📊 Reports", file: "reports.html" }
  ];

  let navHTML = `
    <aside class="sidebar">
      <div class="brand-title">Happy Paws</div>
      <div class="brand-subtitle">Better Care, Happier Pets.</div>
      <ul class="nav-list">
  `;

  menuItems.forEach(item => {
    // Awtomatikong lalagyan ng 'active' class ang nakabukas na pahina
    const isActive = (currentPage === item.file) ? 'class="active"' : '';
    navHTML += `<li ${isActive}><a href="${item.file}">${item.name}</a></li>`;
  });

  navHTML += `
      </ul>
    </aside>
  `;

  sidebarContainer.innerHTML = navHTML;
});
