/**
 * SidebarToggle.js
 * Handles mobile sidebar toggle functionality
 */

/**
 * Initialize sidebar toggle for mobile
 */
export function initializeSidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  const toggleButton = document.getElementById('sidebar-toggle');
  const overlay = document.getElementById('sidebar-overlay');

  if (!sidebar || !toggleButton || !overlay) {
    console.warn('Sidebar toggle elements not found');
    return;
  }

  // Toggle sidebar function
  function toggleSidebar() {
    const isActive = sidebar.classList.contains('active');

    if (isActive) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  // Open sidebar
  function openSidebar() {
    sidebar.classList.add('active');
    overlay.classList.add('active');
    toggleButton.setAttribute('aria-expanded', 'true');
  }

  // Close sidebar
  function closeSidebar() {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    toggleButton.setAttribute('aria-expanded', 'false');
  }

  // Event listeners
  toggleButton.addEventListener('click', toggleSidebar);
  overlay.addEventListener('click', closeSidebar);

  // Close sidebar on escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sidebar.classList.contains('active')) {
      closeSidebar();
    }
  });

  // Close sidebar when clicking a layer (on mobile)
  sidebar.addEventListener('click', e => {
    // Only auto-close on mobile screens
    if (window.innerWidth <= 768) {
      // If clicking a load button or layer item, close sidebar after a short delay
      if (e.target.classList.contains('load-button') || e.target.closest('.layer-item')) {
        setTimeout(closeSidebar, 300);
      }
    }
  });

  console.log('✓ Sidebar toggle initialized');
}
