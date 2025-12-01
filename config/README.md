# Configuration Directory

This directory contains the styling configuration files for the dynamic layer styling system.

## Directory Structure

```
/config/
├── README.md                    # This file
├── styles.json                  # Main configuration index
├── layers/
│   ├── _template.json          # Template for creating new layer configs
│   ├── housing.json            # Housing layer styling configuration
│   ├── registry.json           # Registry layer styling configuration
│   └── [layer-id].json         # Additional layer configurations
└── schemas/
    └── layer-config.schema.json # JSON schema for validation
```

## Configuration Files

### styles.json

Main index file that lists all available layers and global defaults.

### layers/[layer-id].json

Individual layer styling configurations. The filename should match the layer ID used in the Koop service catalog.

### \_template.json

Template file showing the expected structure for new layer configurations. Copy this file and modify it when adding support for new layers.

## Adding a New Layer

1. Copy `layers/_template.json` to `layers/[your-layer-id].json`
2. Update the configuration with your layer's specific properties and styling rules
3. Add an entry to `styles.json` referencing your new configuration file
4. Restart the server to load the new configuration

## Configuration Format

Layer configurations support:

- **Categorical rules**: Map discrete property values to specific styles
- **Numeric rules**: Apply styles based on value ranges (future enhancement)
- **Conditional rules**: Complex logic-based styling (future enhancement)

See individual layer files for examples of each rule type.
