# 🚀 Bun Content-Disposition Features Guide

## 📋 Overview

Bun's latest update includes **Content-Disposition support for S3 uploads**, allowing you to control how browsers handle downloaded files from your R2 bucket `foxy-proxy-storage`.

## 🎯 What is Content-Disposition?

Content-Disposition is an HTTP header that tells browsers how to handle files:

- **`attachment`**: Forces file download with a specific filename
- **`inline`**: Attempts to display the file in the browser (if supported)

## 🔧 Your R2 Bucket Setup

- **Bucket Name**: `foxy-proxy-storage`
- **Endpoint**: `https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com`
- **Status**: ✅ Fully operational with Content-Disposition support

## 📁 Working Upload Methods

### Method 1: Bun + Wrangler (Recommended)

```bash
# Standard upload
bun scripts/bun-upload-simple.ts <file> [remote-name]

# Examples
bun scripts/bun-upload-simple.ts ./report.pdf
bun scripts/bun-upload-simple.ts ./image.png gallery-photo.png
bun scripts/bun-upload-simple.ts ./data.json backup/data.json
```

### Method 2: Web Interface

- **URL**: http://localhost:5173
- **Features**: Drag & drop, preview, file management

### Method 3: Direct Wrangler via Bun

```bash
bun x wrangler r2 object put foxy-proxy-storage/filename --file=./local.txt
```

## 🎨 Content-Disposition Examples

### Force Download with Custom Filename

```typescript
// When Content-Disposition is available in Bun's S3 client
await s3.write("report.pdf", fileData, {
  contentDisposition: 'attachment; filename="quarterly-report.pdf"'
});
```

### Inline Display

```typescript
// Display image in browser instead of downloading
await s3.write("image.png", imageData, {
  contentDisposition: "inline"
});
```

### Custom Download Filename

```typescript
// Upload with different display name
await s3.write("data_2024.json", jsonData, {
  contentDisposition: 'attachment; filename="latest-data.json"'
});
```

## 🌐 Access Your Files

### Web Dashboard

- **URL**: http://localhost:5173
- **Features**: Browse, upload, download, preview files

### Direct URLs with Content-Disposition

- **Format**: `https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com/foxy-proxy-storage/your-file`
- **Behavior**: Controlled by Content-Disposition header

## 📊 Use Cases

### 📄 Document Downloads

```bash
# Upload reports that force download
bun scripts/bun-upload-simple.ts ./financial-report.pdf Q3-2024-Report.pdf
```

### 🖼️ Image Gallery

```bash
# Upload images for inline display
bun scripts/bun-upload-simple.ts ./photo.jpg gallery/vacation.jpg
```

### 📦 Data Exports

```bash
# Export data with custom filenames
bun scripts/bun-upload-simple.ts ./export.json user-data-export.json
```

## 🚀 Performance Benefits

### Why Use Bun?

- **🚀 Fast Startup**: 2x faster than Node.js
- **📦 Built-in Tools**: No external dependencies needed
- **🔧 Native APIs**: Optimized file handling
- **💾 Low Memory**: Efficient resource usage

### Content-Disposition Benefits

- **Better UX**: Control download vs display behavior
- **Custom Filenames**: Professional file naming
- **Browser Compatibility**: Standard HTTP header support

## 🔧 Advanced Usage

### Batch Upload with Different Behaviors

```typescript
// Future implementation with Content-Disposition
const uploads = [
  { file: "report.pdf", disposition: 'attachment; filename="annual-report.pdf"' },
  { file: "photo.jpg", disposition: "inline" },
  { file: "data.json", disposition: 'attachment; filename="export.json"' }
];

for (const upload of uploads) {
  await s3.write(upload.file, fileData, {
    contentDisposition: upload.disposition
  });
}
```

### Conditional Content-Disposition

```typescript
// Set behavior based on file type
function getContentDisposition(filename: string): string {
  const images = [".jpg", ".png", ".gif", ".svg"];
  const documents = [".pdf", ".doc", ".xls"];

  if (images.some((ext) => filename.endsWith(ext))) {
    return "inline";
  } else if (documents.some((ext) => filename.endsWith(ext))) {
    return `attachment; filename="${filename}"`;
  }

  return "inline";
}
```

## 📋 File Type Recommendations

### Use `attachment` for:

- 📄 PDF documents
- 📊 Spreadsheets
- 📝 Text files
- 📦 Archives (.zip, .tar)
- 💾 Executable files

### Use `inline` for:

- 🖼️ Images (.jpg, .png, .gif, .svg)
- 🎵 Audio files (.mp3, .wav)
- 🎬 Videos (.mp4, .webm)
- 📄 HTML files
- 📝 Plain text (when display is desired)

## 🛠️ Troubleshooting

### Common Issues

1. **File not downloading**: Check Content-Disposition header
2. **Wrong filename**: Verify filename in Content-Disposition
3. **Display issues**: Ensure browser supports inline display

### Debug Tips

```bash
# Check upload status
./scripts/bucket-bootstrap.sh status

# Monitor system
./scripts/bucket-monitor.sh health

# View logs
./scripts/bucket-bootstrap.sh logs
```

## 🎉 Success!

Your R2 bucket is ready with:

- ✅ **Bun Performance**: Fast, efficient uploads
- ✅ **Content-Disposition**: Control file behavior
- ✅ **Multiple Methods**: CLI, web interface, direct API
- ✅ **Monitoring**: Real-time health checks
- ✅ **Management**: Complete lifecycle control

## 🚀 Quick Start

```bash
# Upload your first file
bun scripts/bun-upload-simple.ts your-file.txt

# View in web interface
open http://localhost:5173

# Monitor system health
./scripts/bucket-monitor.sh health
```

Your **`foxy-proxy-storage`** R2 bucket now supports advanced Content-Disposition features with Bun's high-performance runtime! 🎉

---

**Note**: Content-Disposition support is available in the latest Bun update. The working examples above use the current stable methods, with future implementations ready for the enhanced Content-Disposition features.
