import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  DesignDetails as DesignDetailsType,
  getDesignById,
} from "../api/designs";
import "./DesignDetails.css";

// Canvas constants as per requirements
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 300;
const PADDING = 15; // 10-20px padding as required

function DesignDetails() {
  const { id } = useParams<{ id: string }>();
  const [design, setDesign] = useState<DesignDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredItem, setHoveredItem] = useState<{
    item: DesignDetailsType["items"][0];
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (id) {
      fetchDesign(id);
    }
  }, [id]);

  useEffect(() => {
    // Draw canvas when design changes
    if (design && canvasRef.current) {
      drawCanvas(design);
    }
  }, [design]);

  const fetchDesign = async (designId: string) => {
    try {
      setLoading(true);
      const data = await getDesignById(designId);
      console.log('[fetchDesign] Received data:', data);
      console.log('[fetchDesign] Items:', data.items);
      console.log('[fetchDesign] Items count:', data.itemsCount);
      console.log('[fetchDesign] Items length:', data.items?.length);
      setDesign(data);
      setError(null);
    } catch (err: any) {
      console.error('[fetchDesign] Error:', err);
      setError(err.message || "Failed to fetch design");
    } finally {
      setLoading(false);
    }
  };

  const drawCanvas = (designData: DesignDetailsType) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('[drawCanvas] Canvas ref is null');
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.warn('[drawCanvas] Could not get 2d context');
      return;
    }

    console.log('[drawCanvas] Starting to draw, designData:', designData);
    console.log('[drawCanvas] Items:', designData.items);
    console.log('[drawCanvas] Items length:', designData.items?.length);
    console.log('[drawCanvas] ItemsCount:', designData.itemsCount);

    // Set canvas size (fixed as per requirements)
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Clear canvas with background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!designData.items || designData.items.length === 0) {
      console.warn('[drawCanvas] No items found, drawing "No rectangles" message');
      // Draw "No rectangles" message
      ctx.fillStyle = "#666666";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        "No rectangles found",
        canvas.width / 2,
        canvas.height / 2
      );
      return;
    }

    // Calculate available drawing area (with padding)
    const availableWidth = canvas.width - PADDING * 2;
    const availableHeight = canvas.height - PADDING * 2;

    // Calculate scale factor to fit SVG while preserving aspect ratio
    const scaleX = availableWidth / designData.svgWidth;
    const scaleY = availableHeight / designData.svgHeight;
    const scale = Math.min(scaleX, scaleY);

    // Calculate offset to center the drawing
    const scaledWidth = designData.svgWidth * scale;
    const scaledHeight = designData.svgHeight * scale;
    const offsetX = (canvas.width - scaledWidth) / 2;
    const offsetY = (canvas.height - scaledHeight) / 2;

    // Draw each rectangle
    console.log('[drawCanvas] Drawing', designData.items.length, 'rectangles');
    console.log('[drawCanvas] SVG dimensions:', designData.svgWidth, 'x', designData.svgHeight);
    console.log('[drawCanvas] Scale:', scale, 'Offset:', offsetX, offsetY);
    
    designData.items.forEach((item, index) => {
      const x = offsetX + item.x * scale;
      const y = offsetY + item.y * scale;
      const width = item.width * scale;
      const height = item.height * scale;

      console.log(`[drawCanvas] Rect ${index + 1}: original(${item.x}, ${item.y}, ${item.width}, ${item.height}) -> canvas(${x.toFixed(2)}, ${y.toFixed(2)}, ${width.toFixed(2)}, ${height.toFixed(2)})`);

      if (
        isNaN(x) ||
        isNaN(y) ||
        isNaN(width) ||
        isNaN(height) ||
        width <= 0 ||
        height <= 0
      ) {
        console.warn(`[drawCanvas] Skipping invalid rect ${index + 1}`);
        return;
      }

      // Draw rectangle fill (only if not transparent/none)
      const fillColor = item.fill || "#000000";
      if (fillColor && fillColor !== "transparent" && fillColor !== "none" && fillColor !== "rgba(0,0,0,0)") {
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, width, height);
        console.log(`[drawCanvas] Filled rect ${index + 1} with color:`, fillColor);
      } else {
        console.log(`[drawCanvas] Rect ${index + 1} has transparent fill, drawing stroke only`);
      }

      // Always draw stroke so rectangle is visible - make it more visible
      if (item.issue === "OUT_OF_BOUNDS") {
        ctx.strokeStyle = "#ff0000"; // Red stroke for out of bounds
        ctx.lineWidth = 3; // Thicker line
      } else {
        // Normal stroke - use darker color for better visibility
        ctx.strokeStyle = "#000000"; // Always black stroke for visibility
        ctx.lineWidth = 2; // Thicker line for better visibility
      }
      ctx.strokeRect(x, y, width, height);
      console.log(`[drawCanvas] Drew stroke for rect ${index + 1}`);
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!design || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate available drawing area (with padding)
    const availableWidth = canvas.width - PADDING * 2;
    const availableHeight = canvas.height - PADDING * 2;

    // Calculate scale factor
    const scaleX = availableWidth / design.svgWidth;
    const scaleY = availableHeight / design.svgHeight;
    const scale = Math.min(scaleX, scaleY);

    // Calculate offset to center the drawing
    const scaledWidth = design.svgWidth * scale;
    const scaledHeight = design.svgHeight * scale;
    const offsetX = (canvas.width - scaledWidth) / 2;
    const offsetY = (canvas.height - scaledHeight) / 2;

    // Convert canvas coordinates to SVG coordinates
    const svgX = (x - offsetX) / scale;
    const svgY = (y - offsetY) / scale;

    // Check if cursor is inside any rectangle
    const hovered = design.items.find((item) => {
      return (
        svgX >= item.x &&
        svgX <= item.x + item.width &&
        svgY >= item.y &&
        svgY <= item.y + item.height
      );
    });

    if (hovered) {
      setHoveredItem({ item: hovered, x: e.clientX, y: e.clientY });
      canvas.style.cursor = "pointer";
    } else {
      setHoveredItem(null);
      canvas.style.cursor = "default";
    }
  };

  const handleCanvasMouseLeave = () => {
    setHoveredItem(null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = "default";
    }
  };

  if (loading) {
    return (
      <div className="design-details">
        <div className="loading">Loading design...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="design-details">
        <div className="error">Error: {error}</div>
        <Link to="/" className="back-link">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!design) {
    return (
      <div className="design-details">
        <div className="error">Design not found</div>
        <Link to="/" className="back-link">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="design-details">
      <div className="details-header">
        <Link to="/" className="back-link">
          ← Back to Dashboard
        </Link>
        <h1>{design.filename}</h1>
      </div>

      <div className="details-content">
        <div className="details-section">
          <h2>Design Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Filename:</span>
              <span className="info-value">{design.filename}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Status:</span>
              <span className="info-value">{design.status}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Items Count:</span>
              <span className="info-value">{design.itemsCount}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Coverage Ratio:</span>
              <span className="info-value">
                {(design.coverageRatio * 100).toFixed(2)}%
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">SVG Dimensions:</span>
              <span className="info-value">
                {design.svgWidth} × {design.svgHeight}px
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Created At:</span>
              <span className="info-value">
                {new Date(design.createdAt).toLocaleString("en-US", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {design.issues.length > 0 && (
              <div className="info-item">
                <span className="info-label">Issues:</span>
                <span className="info-value">{design.issues.join(", ")}</span>
              </div>
            )}
          </div>
        </div>

        <div className="details-section">
          <h2>Canvas Preview</h2>
          <div className="canvas-container">
            <canvas
              ref={canvasRef}
              className="preview-canvas"
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
            ></canvas>
            {hoveredItem && (
              <div
                className="tooltip"
                style={{
                  position: "fixed",
                  left: hoveredItem.x + 10,
                  top: hoveredItem.y + 10,
                }}
              >
                <div className="tooltip-content">
                  <div>
                    <strong>Rectangle Details</strong>
                  </div>
                  <div>x: {hoveredItem.item.x}</div>
                  <div>y: {hoveredItem.item.y}</div>
                  <div>width: {hoveredItem.item.width}</div>
                  <div>height: {hoveredItem.item.height}</div>
                  <div>fill: {hoveredItem.item.fill || "none"}</div>
                  {hoveredItem.item.issue && (
                    <div>issue: {hoveredItem.item.issue}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {design.items && design.items.length > 0 && (
          <div className="details-section">
            <h2>Detected Rectangles ({design.items.length})</h2>
            <div className="rects-list">
              {design.items.map((item, index) => (
                <div
                  key={index}
                  className={`rect-item ${item.issue ? "has-issue" : ""}`}
                >
                  <div className="rect-header">Rectangle {index + 1}</div>
                  <div className="rect-details">
                    <span>X: {item.x}</span>
                    <span>Y: {item.y}</span>
                    <span>Width: {item.width}</span>
                    <span>Height: {item.height}</span>
                    <span>Fill: {item.fill || "none"}</span>
                    {item.issue && (
                      <span className="rect-issue">Issue: {item.issue}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DesignDetails;
