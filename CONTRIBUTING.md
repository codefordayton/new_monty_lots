# Contributing to New Monty Lots

Welcome to the New Monty Lots project! This guide will help you get started with contributing to our Koop-based GeoJSON server and mapping application.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)
- **Git** for version control

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/codefordayton/new_monty_lots.git
   cd new_monty_lots
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **View the application**
   - Open http://localhost:8080 in your browser
   - The server auto-restarts on file changes with nodemon

## 📁 Project Structure

```
new_monty_lots/
├── index.js              # Koop server with custom catalog endpoint
├── index.html            # Frontend interface with Leaflet map
├── provider-data/        # GeoJSON data files (auto-discovered)
├── package.json          # Dependencies and scripts
├── CLAUDE.md            # Project documentation for Claude Code
└── CONTRIBUTING.md      # This file
```

## 🛠 Development Workflow

### Making Changes

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code style and patterns
   - Test your changes locally with `npm run dev`

3. **Test your changes**
   - Verify the application loads at http://localhost:8080
   - Check browser console for JavaScript errors
   - Test with different GeoJSON files in `provider-data/`

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "Add: your feature description"
   ```

5. **Push and create a pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

## 🎯 Development Guidelines

### Frontend (index.html)

- **Vanilla JavaScript** - Keep dependencies minimal
- **Leaflet** for mapping functionality
- **Responsive design** - Ensure mobile compatibility
- **Accessibility** - Use semantic HTML and ARIA labels
- **Performance** - Optimize for large datasets (use clustering)

### Backend (index.js)

- **Koop framework** - Follow Koop conventions
- **Express.js** patterns for custom endpoints
- **Error handling** - Graceful fallbacks for missing data
- **Logging** - Use structured logging for debugging

### Code Style

- **Indentation**: Use tabs for HTML/JS, 2 spaces for JSON
- **Naming**: Use camelCase for variables, kebab-case for CSS classes
- **Comments**: Explain complex logic and business rules
- **Functions**: Keep functions small and focused

## 🧪 Testing

### Manual Testing

1. **Layer Loading**
   - Test with small and large datasets
   - Verify clustering works for >1000 features
   - Check layer visibility toggles

2. **UI Responsiveness**
   - Test on mobile and desktop
   - Verify sidebar scrolling on small screens
   - Check map controls accessibility

3. **Error Handling**
   - Test with invalid GeoJSON files
   - Test server disconnection scenarios
   - Verify graceful fallbacks

### Adding Test Data

- Place `.geojson` files in `provider-data/` directory
- Files are automatically discovered and served
- Use meaningful filenames (they become layer names)
- Test with various geometry types (Point, Polygon, LineString)

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Browser and version**
5. **Console errors** (if any)
6. **Sample data** (if data-specific)

## ✨ Feature Requests

When requesting features, please include:

1. **User story** - Who needs this and why?
2. **Acceptance criteria** - How will we know it's done?
3. **Design considerations** - UI/UX mockups if applicable
4. **Technical requirements** - Any specific constraints

## 📋 Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or improvement
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `frontend` - UI/UX related
- `backend` - Server/API related
- `performance` - Speed/memory optimization
- `documentation` - Documentation improvements

## 🎨 UI/UX Guidelines

### Design Principles

- **Clean and minimal** - Focus on the map data
- **Progressive disclosure** - Show details on demand
- **Performance first** - Handle large datasets gracefully
- **Mobile responsive** - Touch-friendly controls

### Color Scheme

```css
/* Primary Colors */
--primary-blue: #007bff;
--success-green: #28a745;
--warning-yellow: #ffc107;
--danger-red: #dc3545;

/* Neutral Colors */
--light-gray: #f8f9fa;
--medium-gray: #6c757d;
--dark-gray: #495057;
```

## 🔧 Common Tasks

### Adding a New Layer Style

1. Edit `getStyleForLayer()` in `index.html`
2. Add new style definition based on layer ID
3. Test with corresponding GeoJSON file

### Modifying the Catalog Endpoint

1. Edit the `/catalog` route in `index.js`
2. Update the file scanning logic
3. Test with different file structures

### Adding New UI Features

1. Update HTML structure in `index.html`
2. Add corresponding CSS styles
3. Implement JavaScript functionality
4. Test across different browsers

## 📚 Resources

- [Koop Documentation](https://koopjs.github.io/)
- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [GeoJSON Specification](https://geojson.org/)
- [Express.js Guide](https://expressjs.com/en/guide/)

## 🤝 Code of Conduct

- Be respectful and inclusive
- Help newcomers get started
- Provide constructive feedback
- Focus on what's best for the project

## 📞 Getting Help

- **GitHub Issues** - For bugs and feature requests
- **Discussions** - For general questions
- **Code for Dayton** - Community support

---

Thank you for contributing to New Monty Lots! Your efforts help make geographic data more accessible and useful for everyone. 🗺️
