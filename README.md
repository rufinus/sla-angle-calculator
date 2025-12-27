# SLA Angle Calculator

Calculate optimal support angles for SLA/resin 3D printers based on pixel size and layer height.

Based on the [original calculator by RC87](https://www.rc87.blog/angle-calculator/).

## Features

- Preset database of 60+ resin printers with accurate specifications
- Manual pixel size input for unlisted printers
- Visual angle diagram with complementary angles
- Handles non-square pixels (shows separate X/Y angles)
- Persistent settings via localStorage
- Dark theme UI

## Usage

### Docker (Recommended)

```bash
docker run -d -p 8080:80 ghcr.io/rufinus/sla-angle-calculator:latest
```

Then open http://localhost:8080

### Docker Compose

```yaml
services:
  sla-calc:
    image: ghcr.io/rufinus/sla-angle-calculator:latest
    ports:
      - "8080:80"
```

### Local Development

```bash
# Build and run
docker-compose up --build

# Access at http://localhost:8080
```

## How It Works

The angle calculation uses the formula:

```
angle = atan(pixelSize / layerHeight)
```

This gives the angle from vertical at which layer stepping becomes visible. The complementary angle (90° - angle) is also shown.

## Adding Printers

Edit `data/printers.json` to add new printer definitions:

```json
{
  "id": "manufacturer-model",
  "manufacturer": "Brand",
  "model": "Model Name",
  "year": 2024,
  "resolution": { "x": 3840, "y": 2400 },
  "screenSize": { "x": 134.4, "y": 84.0 },
  "buildVolume": { "x": 134.4, "y": 84.0, "z": 180.0 },
  "pixelSize": { "x": 35, "y": 35 },
  "zResolution": { "min": 10, "max": 200 }
}
```

## License

MIT
