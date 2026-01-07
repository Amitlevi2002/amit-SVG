# SVG Design Manager

A full-stack application for uploading, analyzing, and managing SVG designs. This project demonstrates end-to-end feature implementation across Backend and Frontend.

## 📋 Project Description

This application allows users to:
- Upload SVG files containing rectangles
- Process and analyze SVG files on the backend
- Store processed data in MongoDB
- View an interactive HTML Canvas preview on the frontend
- Detect issues like empty files or out-of-bounds rectangles

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (running locally or connection string)
- npm or yarn

### MongoDB Setup

#### Option 1: Local MongoDB Installation
1. Install MongoDB from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Start MongoDB service:
   ```bash
   # Windows
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl start mongod
   # or
   brew services start mongodb-community
   ```

#### Option 2: Docker (Recommended)
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### Option 3: MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster and get your connection string
3. Update `MONGODB_URI` in backend `.env` file

### Environment Variables

Create a `.env` file in the `backend` directory:
```env
PORT=8888
MONGODB_URI=mongodb://localhost:27017/svg-designs
CORS_ORIGIN=http://localhost:5173
```

**Connection Details:**
- Default MongoDB URI: `mongodb://localhost:27017/svg-designs`
- Database name: `svg-designs`
- Collection: `designs` (created automatically)

### Backend Setup
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:8888`

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173` (or assigned port)

## 📋 Features

- ✅ Upload SVG files via multipart/form-data
- ✅ Parse SVG and extract rectangles (x, y, width, height, fill)
- ✅ Store designs in MongoDB
- ✅ Calculate coverage ratio and detect issues
- ✅ View designs list with status and metadata
- ✅ Interactive HTML Canvas preview (600×300px)
- ✅ Hover/click on rectangles to see details
- ✅ Highlight out-of-bounds rectangles
- ✅ Delete designs

## 🏗️ Architecture

### Backend
- **Framework**: Express.js + TypeScript
- **Database**: MongoDB with Mongoose
- **File Upload**: Multer
- **SVG Parsing**: Custom parser with xml2js

### Frontend
- **Framework**: React + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router
- **Canvas**: HTML5 Canvas API
- **Styling**: CSS with glassmorphism design

## 📡 API Endpoints

- `POST /upload` - Upload SVG file (multipart/form-data)
- `GET /api/designs` - Get all designs
- `GET /api/designs/:id` - Get design by ID with parsed data
- `DELETE /api/designs/:id` - Delete design
- `GET /health` - Health check
- `GET /uploads/:filename` - Serve static SVG files

## 🎨 Canvas Preview Features

The canvas preview meets all requirements:
- Fixed canvas size: 600×300px
- Automatic scaling to fit SVG while preserving aspect ratio
- Padding: 15px around content
- Draws rectangles using `fillRect` and `strokeRect`
- Highlights OUT_OF_BOUNDS rectangles with red stroke
- Interactive hover/click to show rectangle details (x, y, width, height, fill, issue)

## 📝 SVG Format Requirements

The application accepts SVG files with:
- One root `<svg>` element with `width` and `height` attributes
- Zero or more `<rect>` elements with: `x`, `y`, `width`, `height`, `fill`

**Example SVG:**
```xml
<svg width="1200" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect x="50" y="80" width="300" height="120" fill="#FF0000" />
  <rect x="400" y="100" width="500" height="200" fill="#00FF00" />
</svg>
```

## 🔍 Issue Detection

The application detects:
- **EMPTY**: No rectangles found in the SVG
- **OUT_OF_BOUNDS**: Any rectangle where `x + width > svgWidth` or `y + height > svgHeight`

## ✅ Status

All requirements implemented and tested:
- ✅ Backend REST API with MongoDB
- ✅ SVG parsing and processing
- ✅ Frontend React application
- ✅ HTML Canvas preview (canvas only, no SVG/img/object)
- ✅ Interactive hover/click functionality
- ✅ Issue detection and highlighting
