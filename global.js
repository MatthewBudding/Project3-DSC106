const pages = [
    { url: '', title: 'Home' },
    { url: '../activity/', title: 'Activity' },
    { url: '../temp/', title: 'Temperature' },
  ];
  // Check if we're on the home page
const ARE_WE_HOME = document.documentElement.classList.contains('home');

// Create a <nav> element and prepend it to the body
const nav = document.createElement('nav');
document.body.prepend(nav);

// Add navigation links dynamically
for (const p of pages) {
  let url = p.url;

  // Adjust relative URLs if not on the home page
  if (!ARE_WE_HOME && !url.startsWith('http')) {
    url = '../' + url;
  }

  // Create the <a> element
  const a = document.createElement('a');
  a.href = url;
  a.textContent = p.title;

  // Highlight the current page
  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname
  );

  // Open external links in a new tab
  if (a.host !== location.host) {
    a.target = '_blank';
  }

  // Append the link to the nav
  nav.append(a);
}