import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Plus, Trash2, Copy, FlipHorizontal, ChevronDown, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

// --- CONSTANTS ---
const NFC_CARD_WIDTH_MM = 85.6;
const NFC_CARD_HEIGHT_MM = 53.98;
const NFC_CARD_CORNER_RADIUS_MM = 3;
const DPI = 150; // Use a reasonable DPI for canvas and PDF
const MM_TO_INCH = 0.0393701;
const CARD_WIDTH_PX = NFC_CARD_WIDTH_MM * MM_TO_INCH * DPI;
const CARD_HEIGHT_PX = NFC_CARD_HEIGHT_MM * MM_TO_INCH * DPI;
const CARD_CORNER_RADIUS_PX = NFC_CARD_CORNER_RADIUS_MM * MM_TO_INCH * DPI;
const BLEED_PX = 15; // The space from the cut line to the start of the design

const TEMPLATES = {
  gameCard: {
    name: 'Game Card',
    colors: {
      border: '#000000',
      outerFrame: '#e3e3e3',
      headerBackground: '#7a5e4a',
      headerBorder: '#000000',
      mainBackground: '#d9c5b2',
      footerBackground: '#e3e3e3',
      footerBorder: '#000000',
      defaultText: '#2c1e14',
    }
  },
  steamRetro: {
    name: 'Steam Retro',
    colors: {
      border: '#000000',
      outerFrame: '#e3e3e3',
      headerBackground: '#7a5e4a',
      headerBorder: '#000000',
      mainBackground: '#d9c5b2',
      footerBackground: '#e3e3e3',
      footerBorder: '#000000',
      defaultText: '#2c1e14',
    }
  },
  magic: {
    name: 'Magic Card',
    colors: {
      border: '#c8503c',
      outerFrame: '#f5e6d3',
      titleBar: '#f5e6d3',
      titleBarBorder: '#8b4513',
      imageFrame: '#000000',
      typeBox: '#f5e6d3',
      typeBoxBorder: '#8b4513',
      textBox: '#f5e6d3',
      cornerBox: '#f5e6d3',
      cornerBoxBorder: '#8b4513',
      defaultText: '#000000'
    }
  },
  classic: {
    name: 'Classic',
    colors: {
      border: '#c8503c',
      outerFrame: '#f5e6d3',
      titleBar: '#f5e6d3',
      titleBarBorder: '#8b4513',
      imageFrame: '#000000',
      typeBox: '#f5e6d3',
      typeBoxBorder: '#8b4513',
      textBox: '#f5e6d3',
      cornerBox: '#f5e6d3',
      cornerBoxBorder: '#8b4513',
      defaultText: '#000000'
    }
  },
  modern: {
    name: 'Modern',
    colors: {
      border: '#000000',
      outerFrame: '#aed6f1', // This will be the base for the gradient
      titleBar: '#eaf2f8',
      titleBarBorder: '#5499c7',
      imageFrame: '#000000',
      typeBox: '#eaf2f8',
      typeBoxBorder: '#5499c7',
      textBox: '#eaf2f8',
      cornerBox: '#eaf2f8',
      cornerBoxBorder: '#5499c7',
      defaultText: '#000000'
    }
  },
};

// --- HELPER & CHILD COMPONENTS ---

function roundRect(ctx, x, y, width, height, radius) {
  if (width < 2 * radius) radius = width / 2;
  if (height < 2 * radius) radius = height / 2;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  return ctx;
}

function wrapText(context, text, x, y, maxWidth, lineHeight, align) {
    const words = text.split(' ');
    let line = '';

    const lines = [];
    for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);
    
    context.textAlign = align;
    let lineX = x;
    if (align === 'center') {
      lineX = x + maxWidth / 2;
    } else if (align === 'right') {
      lineX = x + maxWidth;
    }

    lines.forEach((l, i) => {
        context.fillText(l, lineX, y + (i * lineHeight));
    });
}

const SidebarSection = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center py-3 text-md font-semibold text-slate-200 hover:text-white"
      >
        <span>{title}</span>
        <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="pb-4 space-y-4">{children}</div>}
    </div>
  );
};


const TextControl = ({ label, value, onUpdate }) => {
  const fonts = ["Arial", "Verdana", "Georgia", "Times New Roman", "Courier New", "Lucida Console", "Impact", "Comic Sans MS", "MPlantin", "Beleren", "Thraex Magnus", "Thraex Sans"];
  
  return (
    <div className="space-y-3 pl-2">
      <h4 className="font-semibold text-slate-300 text-sm">{label}</h4>
      <input type="text" value={value.text} onChange={(e) => onUpdate({ ...value, text: e.target.value })} className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-400">Size</label>
          <input type="number" value={value.fontSize} onChange={(e) => onUpdate({ ...value, fontSize: parseInt(e.target.value, 10) || 10 })} className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Color</label>
          <input type="color" value={value.color} onChange={(e) => onUpdate({ ...value, color: e.target.value })} className="w-full h-10 p-0 border-none cursor-pointer bg-slate-700 rounded-lg" />
        </div>
      </div>
       <div>
        <label className="text-xs text-slate-400">Font Style</label>
        <select value={value.fontStyle} onChange={(e) => onUpdate({ ...value, fontStyle: e.target.value })} className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm mt-1">
          {fonts.map(font => <option key={font} value={font}>{font}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-400">Alignment</label>
        <div className="flex items-center gap-1 mt-1">
          <button onClick={() => onUpdate({ ...value, align: 'left' })} className={`p-2 rounded-lg ${value.align === 'left' ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-300'}`}><AlignLeft size={16} /></button>
          <button onClick={() => onUpdate({ ...value, align: 'center' })} className={`p-2 rounded-lg ${value.align === 'center' ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-300'}`}><AlignCenter size={16} /></button>
          <button onClick={() => onUpdate({ ...value, align: 'right' })} className={`p-2 rounded-lg ${value.align === 'right' ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-300'}`}><AlignRight size={16} /></button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

function App() {
  const [cards, setCards] = useState([{
    id: 1,
    template: 'gameCard',
    orientation: 'vertical',
    title: { text: 'Card Title', fontSize: 24, align: 'center', color: TEMPLATES.gameCard.colors.defaultText, fontStyle: 'Arial' },
    description: { text: 'Card Description', fontSize: 14, align: 'left', color: TEMPLATES.gameCard.colors.defaultText, fontStyle: 'Arial' },
    type: { text: 'Type', fontSize: 18, align: 'left', color: TEMPLATES.gameCard.colors.defaultText, fontStyle: 'Arial' },
    cornerText: { text: '1', fontSize: 20, align: 'center', color: TEMPLATES.gameCard.colors.defaultText, fontStyle: 'Arial' },
    artistText: { text: 'Artist Name', fontSize: 12, align: 'left', color: TEMPLATES.gameCard.colors.defaultText, fontStyle: 'Arial' },
    footerText: { text: 'Footer', fontSize: 12, align: 'right', color: TEMPLATES.gameCard.colors.defaultText, fontStyle: 'Arial' },
    colors: { ...TEMPLATES.gameCard.colors },
    image: null,
    headerImage: null,
    imageTransform: { x: 50, y: 50, scale: 1 },
    headerImageTransform: { x: 50, y: 50, scale: 1 },
    outerFrameDesign: 'solid',
  }]);
  
  const [activeCardId, setActiveCardId] = useState(1);
  const [showCutLines, setShowCutLines] = useState(true);
  const [nextId, setNextId] = useState(2);
  const [isExporting, setIsExporting] = useState(false);
  const [isPdfLibReady, setIsPdfLibReady] = useState(false);
  const mainFileInputRef = useRef(null);
  const headerFileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const [loadedImages, setLoadedImages] = useState({});

  const activeCard = cards.find(c => c.id === activeCardId);

  useEffect(() => {
    if (window.jspdf) { setIsPdfLibReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.async = true;
    script.onload = () => setIsPdfLibReady(true);
    document.body.appendChild(script);
    return () => { if(script.parentNode) document.body.removeChild(script); };
  }, []);

  const drawCardOnCanvas = useCallback((ctx, card, options = {}) => {
    const { isExport = false, images = loadedImages } = options;
    const isVertical = card.orientation === 'vertical';
    const W = isVertical ? CARD_HEIGHT_PX : CARD_WIDTH_PX;
    const H = isVertical ? CARD_WIDTH_PX : CARD_HEIGHT_PX;
    const bleed = isExport ? 0 : BLEED_PX;
    const W_design = W - bleed * 2;
    const H_design = H - bleed * 2;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(bleed, bleed);
    const PADDING = W_design * 0.035;
    const BORDER_RAD = W_design * 0.04;
    const FRAME_RAD = W_design * 0.025;
    
    if (card.template === 'steamRetro' || card.template === 'gameCard') {
      const headerImageAspectRatio = 770 / 150;
      const HEADER_H = W_design / headerImageAspectRatio;

      // 1. Header (Image and Text)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, BORDER_RAD);
      ctx.arcTo(0, 0, BORDER_RAD, 0, BORDER_RAD);
      ctx.lineTo(W_design - BORDER_RAD, 0);
      ctx.arcTo(W_design, 0, W_design, BORDER_RAD, BORDER_RAD);
      ctx.lineTo(W_design, HEADER_H);
      ctx.lineTo(0, HEADER_H);
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = card.colors.headerBackground;
      ctx.fillRect(0, 0, W_design, HEADER_H);

      if (card.headerImage && images[card.headerImage]) {
        const img = images[card.headerImage];
        const scale = card.headerImageTransform.scale;
        const imgRatio = img.width / img.height;
        const frameRatio = W_design / HEADER_H;
        let sWidth, sHeight, sx, sy;
        if (imgRatio > frameRatio) { sHeight = img.height; sWidth = sHeight * frameRatio; }  
        else { sWidth = img.width; sHeight = sWidth / frameRatio; }
        sWidth /= scale; sHeight /= scale;
        sx = (img.width - sWidth) * (card.headerImageTransform.x / 100);
        sy = (img.height - sHeight) * (card.headerImageTransform.y / 100);
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, W_design, HEADER_H);
      }
      ctx.restore();

      ctx.textBaseline = 'middle';
      ctx.fillStyle = card.type.color;
      ctx.font = `bold ${card.type.fontSize}px ${card.type.fontStyle}`;
      ctx.textAlign = 'left';
      ctx.fillText(card.type.text, PADDING, HEADER_H / 2);
      
      ctx.fillStyle = card.cornerText.color;
      ctx.font = `bold ${card.cornerText.fontSize}px ${card.cornerText.fontStyle}`;
      ctx.textAlign = 'right';
      ctx.fillText(card.cornerText.text, W_design - PADDING, HEADER_H / 2);
      
      ctx.fillStyle = card.description.color;
      ctx.font = `${card.description.fontSize}px ${card.description.fontStyle}`;
      ctx.textAlign = 'center';
      ctx.fillText(card.description.text, W_design / 2, HEADER_H - PADDING);

      const bodyY = HEADER_H;
      
      ctx.fillStyle = card.colors.border;
      ctx.beginPath();
      ctx.moveTo(0, bodyY + BORDER_RAD);
      ctx.arcTo(0, bodyY, BORDER_RAD, bodyY, BORDER_RAD);
      ctx.lineTo(W_design - BORDER_RAD, bodyY);
      ctx.arcTo(W_design, bodyY, W_design, bodyY + BORDER_RAD, BORDER_RAD);
      ctx.lineTo(W_design, H_design - BORDER_RAD);
      ctx.arcTo(W_design, H_design, W_design - BORDER_RAD, H_design, BORDER_RAD);
      ctx.lineTo(BORDER_RAD, H_design);
      ctx.arcTo(0, H_design, 0, H_design - BORDER_RAD, BORDER_RAD);
      ctx.closePath();
      ctx.fill();
      
      const frameX = PADDING;
      const frameY = bodyY + PADDING;
      const frameW = W_design - PADDING * 2;
      const frameH = H_design - bodyY - PADDING * 2;
      
      ctx.save();
      roundRect(ctx, frameX, frameY, frameW, frameH, FRAME_RAD).clip();

      if (card.outerFrameDesign === 'wateryBlue') {
        const gradient = ctx.createLinearGradient(0, 0, W_design, H_design);
        gradient.addColorStop(0, '#aed6f1');
        gradient.addColorStop(0.5, '#5dade2');
        gradient.addColorStop(1, '#aed6f1');
        ctx.fillStyle = gradient;
        ctx.fillRect(frameX, frameY, frameW, frameH);
      } else if (card.outerFrameDesign === 'crackedDesert') {
          ctx.fillStyle = card.colors.outerFrame;
          ctx.fillRect(frameX, frameY, frameW, frameH);
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 1.5;
          for(let i=0; i<150; i++) {
              let x, y, len;
              len = Math.random() * 25 + 5;
              if(Math.random() > 0.5) {
                  x = Math.random() > 0.5 ? frameX + Math.random() * 20 : frameX + frameW - Math.random() * 20;
                  y = Math.random() * frameH + frameY;
              } else {
                  x = Math.random() * frameW + frameX;
                  y = Math.random() > 0.5 ? frameY + Math.random() * 20 : frameY + frameH - Math.random() * 20;
              }
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x + (Math.random() - 0.5) * len, y + (Math.random() - 0.5) * len);
              ctx.stroke();
          }
      } else if (card.outerFrameDesign === 'lavaFlow') {
          ctx.fillStyle = card.colors.outerFrame;
          ctx.fillRect(frameX, frameY, frameW, frameH);
          for(let i=0; i<35; i++) {
              const x = Math.random() * frameW + frameX;
              const y = Math.random() * frameH + frameY;
              const rad = Math.random() * 60 + 30;
              const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
              grad.addColorStop(0, 'rgba(255, 255, 100, 0.9)');
              grad.addColorStop(0.6, 'rgba(255, 120, 0, 0.6)');
              grad.addColorStop(1, 'rgba(200, 0, 0, 0)');
              ctx.fillStyle = grad;
              ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
          }
      } else if (card.outerFrameDesign === 'sandy') {
          ctx.fillStyle = card.colors.outerFrame;
          ctx.fillRect(frameX, frameY, frameW, frameH);
          for (let i=0; i<40000; i++) {
              ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.35})`;
              ctx.fillRect(Math.random() * frameW + frameX, Math.random() * frameH + frameY, Math.random() * 2, Math.random() * 2);
          }
          for (let i=0; i<10000; i++) {
              ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.25})`;
              ctx.fillRect(Math.random() * frameW + frameX, Math.random() * frameH + frameY, 1, 1);
          }
      } else if (card.outerFrameDesign === 'galaxy') {
          ctx.fillStyle = card.colors.outerFrame;
          ctx.fillRect(frameX, frameY, frameW, frameH);
          for (let i = 0; i < 600; i++) {
              ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.9 + 0.1})`;
              ctx.beginPath();
              ctx.arc(Math.random() * frameW + frameX, Math.random() * frameH + frameY, Math.random() * 2.5, 0, Math.PI * 2);
              ctx.fill();
          }
          for (let i = 0; i < 7; i++) {
              const x = Math.random() * frameW + frameX;
              const y = Math.random() * frameH + frameY;
              const rad = Math.random() * 150 + 80;
              const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
              grad.addColorStop(0, `rgba(180, 120, 255, 0.4)`);
              grad.addColorStop(1, `rgba(180, 120, 255, 0)`);
              ctx.fillStyle = grad;
              ctx.fillRect(x - rad, y - rad, rad*2, rad*2);
          }
          for (let i = 0; i < 5; i++) {
              const x = Math.random() * frameW + frameX;
              const y = Math.random() * frameH + frameY;
              const rad = Math.random() * 120 + 60;
              const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
              grad.addColorStop(0, `rgba(255, 150, 200, 0.3)`);
              grad.addColorStop(1, `rgba(255, 150, 200, 0)`);
              ctx.fillStyle = grad;
              ctx.fillRect(x - rad, y - rad, rad*2, rad*2);
          }
      } else if (card.outerFrameDesign === 'holographicShimmer') {
          ctx.fillStyle = card.colors.outerFrame;
          ctx.fillRect(frameX, frameY, frameW, frameH);
          const grad = ctx.createLinearGradient(frameX, frameY, frameX + frameW, frameY + frameH);
          const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
          colors.forEach((color, index) => { grad.addColorStop(index / (colors.length -1), color + '99'); });
          ctx.fillStyle = grad;
          ctx.fillRect(frameX, frameY, frameW, frameH);
          ctx.strokeStyle = 'rgba(255,255,255,0.25)';
          ctx.lineWidth = 1;
          for(let i=0; i < (frameW + frameH) * 2; i+=12){
            ctx.beginPath(); ctx.moveTo(frameX + i, frameY); ctx.lineTo(frameX, frameY + i); ctx.stroke();
          }
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          for(let i=0; i < (frameW + frameH) * 2; i+=15){
            ctx.beginPath(); ctx.moveTo(frameX, frameY + i); ctx.lineTo(frameX + i, frameY + frameH); ctx.stroke();
          }
      } else {
        ctx.fillStyle = card.colors.outerFrame;
        ctx.fillRect(frameX, frameY, frameW, frameH);
      }
      
      const isGameCard = card.template === 'gameCard';
      const FOOTER_H = isGameCard ? 0 : H_design * 0.10;
      const MAIN_H = frameH - FOOTER_H;
      
      if (card.image && images[card.image]) {
        const img = images[card.image];
        const imgAspectRatio = img.width / img.height;
        const containerW = frameW;
        const containerH = MAIN_H;
        const containerAspectRatio = containerW / containerH;
        let destW, destH;
        if (imgAspectRatio > containerAspectRatio) {
          destW = containerW;
          destH = destW / imgAspectRatio;
        } else {
          destH = containerH;
          destW = destH * imgAspectRatio;
        }
        const destX = frameX + (containerW - destW) / 2;
        const destY = frameY + (containerH - destH) / 2;
        const scale = card.imageTransform.scale;
        const sWidth = img.width / scale;
        const sHeight = img.height / scale;
        const sx = (img.width - sWidth) * (card.imageTransform.x / 100);
        const sy = (img.height - sHeight) * (card.imageTransform.y / 100);
        ctx.drawImage(img, sx, sy, sWidth, sHeight, destX, destY, destW, destH);
      }
      
      if (!isGameCard) {
        const FOOTER_Y = frameY + frameH - FOOTER_H;
        ctx.fillStyle = card.colors.footerBackground;
        ctx.fillRect(frameX, FOOTER_Y, frameW, FOOTER_H);
        ctx.strokeStyle = card.colors.footerBorder;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(frameX, FOOTER_Y);
        ctx.lineTo(frameX + frameW, FOOTER_Y);
        ctx.stroke();

        ctx.textBaseline = 'middle';
        ctx.fillStyle = card.artistText.color;
        ctx.font = `${card.artistText.fontSize}px ${card.artistText.fontStyle}`;
        wrapText(ctx, card.artistText.text, frameX + PADDING, FOOTER_Y + PADDING, frameW - PADDING * 2, card.artistText.fontSize * 1.2, card.artistText.align);

        ctx.fillStyle = card.footerText.color;
        ctx.font = `italic ${card.footerText.fontSize}px ${card.footerText.fontStyle}`;
        ctx.textAlign = 'right';
        ctx.fillText(card.footerText.text, frameX + frameW - PADDING, FOOTER_Y + FOOTER_H - PADDING);
      }
      ctx.restore();
    } else {
      // --- EXISTING LOGIC FOR OTHER TEMPLATES ---
      ctx.fillStyle = card.colors.border;
      roundRect(ctx, 0, 0, W_design, H_design, BORDER_RAD).fill();

      const frameX = PADDING;
      const frameY = PADDING;
      const frameW = W_design - PADDING * 2;
      const frameH = H_design - PADDING * 2;
      ctx.save();
      roundRect(ctx, frameX, frameY, frameW, frameH, FRAME_RAD).clip();
      if (card.outerFrameDesign === 'wateryBlue') {
        const gradient = ctx.createLinearGradient(0, 0, W_design, H_design);
        gradient.addColorStop(0, '#aed6f1');
        gradient.addColorStop(0.5, '#5dade2');
        gradient.addColorStop(1, '#aed6f1');
        ctx.fillStyle = gradient;
        ctx.fillRect(frameX, frameY, frameW, frameH);
      } else if (card.outerFrameDesign === 'crackedDesert') {
          ctx.fillStyle = card.colors.outerFrame;
          ctx.fillRect(frameX, frameY, frameW, frameH);
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 1.5;
          for(let i=0; i<150; i++) {
              let x, y, len;
              len = Math.random() * 25 + 5;
              if(Math.random() > 0.5) {
                  x = Math.random() > 0.5 ? frameX + Math.random() * 20 : frameX + frameW - Math.random() * 20;
                  y = Math.random() * frameH + frameY;
              } else {
                  x = Math.random() * frameW + frameX;
                  y = Math.random() > 0.5 ? frameY + Math.random() * 20 : frameY + frameH - Math.random() * 20;
              }
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x + (Math.random() - 0.5) * len, y + (Math.random() - 0.5) * len);
              ctx.stroke();
          }
      } else if (card.outerFrameDesign === 'lavaFlow') {
          ctx.fillStyle = card.colors.outerFrame;
          ctx.fillRect(frameX, frameY, frameW, frameH);
          for(let i=0; i<35; i++) {
              const x = Math.random() * frameW + frameX;
              const y = Math.random() * frameH + frameY;
              const rad = Math.random() * 60 + 30;
              const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
              grad.addColorStop(0, 'rgba(255, 255, 100, 0.9)');
              grad.addColorStop(0.6, 'rgba(255, 120, 0, 0.6)');
              grad.addColorStop(1, 'rgba(200, 0, 0, 0)');
              ctx.fillStyle = grad;
              ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
          }
      } else if (card.outerFrameDesign === 'sandy') {
          ctx.fillStyle = card.colors.outerFrame;
          ctx.fillRect(frameX, frameY, frameW, frameH);
          for (let i=0; i<40000; i++) {
              ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.35})`;
              ctx.fillRect(Math.random() * frameW + frameX, Math.random() * frameH + frameY, Math.random() * 2, Math.random() * 2);
          }
          for (let i=0; i<10000; i++) {
              ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.25})`;
              ctx.fillRect(Math.random() * frameW + frameX, Math.random() * frameH + frameY, 1, 1);
          }
      } else if (card.outerFrameDesign === 'galaxy') {
          ctx.fillStyle = card.colors.outerFrame;
          ctx.fillRect(frameX, frameY, frameW, frameH);
          for (let i = 0; i < 600; i++) {
              ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.9 + 0.1})`;
              ctx.beginPath();
              ctx.arc(Math.random() * frameW + frameX, Math.random() * frameH + frameY, Math.random() * 2.5, 0, Math.PI * 2);
              ctx.fill();
          }
          for (let i = 0; i < 7; i++) {
              const x = Math.random() * frameW + frameX;
              const y = Math.random() * frameH + frameY;
              const rad = Math.random() * 150 + 80;
              const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
              grad.addColorStop(0, `rgba(180, 120, 255, 0.4)`);
              grad.addColorStop(1, `rgba(180, 120, 255, 0)`);
              ctx.fillStyle = grad;
              ctx.fillRect(x - rad, y - rad, rad*2, rad*2);
          }
          for (let i = 0; i < 5; i++) {
              const x = Math.random() * frameW + frameX;
              const y = Math.random() * frameH + frameY;
              const rad = Math.random() * 120 + 60;
              const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
              grad.addColorStop(0, `rgba(255, 150, 200, 0.3)`);
              grad.addColorStop(1, `rgba(255, 150, 200, 0)`);
              ctx.fillStyle = grad;
              ctx.fillRect(x - rad, y - rad, rad*2, rad*2);
          }
      } else if (card.outerFrameDesign === 'holographicShimmer') {
          ctx.fillStyle = card.colors.outerFrame;
          ctx.fillRect(frameX, frameY, frameW, frameH);
          const grad = ctx.createLinearGradient(frameX, frameY, frameX + frameW, frameY + frameH);
          const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
          colors.forEach((color, index) => {
              grad.addColorStop(index / (colors.length -1), color + '99');
          });
          ctx.fillStyle = grad;
          ctx.fillRect(frameX, frameY, frameW, frameH);
          ctx.strokeStyle = 'rgba(255,255,255,0.25)';
          ctx.lineWidth = 1;
          for(let i=0; i < (frameW + frameH) * 2; i+=12){
            ctx.beginPath();
            ctx.moveTo(frameX + i, frameY);
            ctx.lineTo(frameX, frameY + i);
            ctx.stroke();
          }
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          for(let i=0; i < (frameW + frameH) * 2; i+=15){
            ctx.beginPath();
            ctx.moveTo(frameX, frameY + i);
            ctx.lineTo(frameX + i, frameY + frameH);
            ctx.stroke();
          }
      } else {
        ctx.fillStyle = card.colors.outerFrame;
        ctx.fillRect(frameX, frameY, frameW, frameH);
      }
      ctx.restore();

      const CONTENT_X = PADDING * 2;
      const CONTENT_W = W_design - PADDING * 4;
      let currentY = CONTENT_X;
      const TITLE_H = H_design * 0.08;
      const DESC_BOX_H = H_design * 0.2;
      const TYPE_BOX_H = TITLE_H;
      
      ctx.fillStyle = card.colors.titleBar;
      ctx.strokeStyle = card.colors.titleBarBorder;
      ctx.lineWidth = 2;
      roundRect(ctx, CONTENT_X, currentY, CONTENT_W, TITLE_H, FRAME_RAD).fill();
      roundRect(ctx, CONTENT_X, currentY, CONTENT_W, TITLE_H, FRAME_RAD).stroke();
      ctx.fillStyle = card.title.color;
      ctx.font = `bold ${card.title.fontSize}px ${card.title.fontStyle}`;
      ctx.textAlign = card.title.align;
      ctx.textBaseline = 'middle';
      let textX = CONTENT_X + CONTENT_W / 2;
      if (card.title.align === 'left') textX = CONTENT_X + PADDING;
      if (card.title.align === 'right') textX = CONTENT_X + CONTENT_W - PADDING;
      ctx.fillText(card.title.text, textX, currentY + TITLE_H / 2);
      currentY += TITLE_H + PADDING;

      const IMG_FRAME_H = H_design - (CONTENT_X * 2) - TITLE_H - TYPE_BOX_H - DESC_BOX_H - (PADDING * 3);
      ctx.strokeStyle = card.colors.imageFrame;
      ctx.lineWidth = 4;
      roundRect(ctx, CONTENT_X, currentY, CONTENT_W, IMG_FRAME_H, FRAME_RAD).stroke();
      if (card.image && images[card.image]) {
          const img = images[card.image];
          ctx.save();
          roundRect(ctx, CONTENT_X, currentY, CONTENT_W, IMG_FRAME_H, FRAME_RAD).clip();
          const scale = card.imageTransform.scale;
          const imgRatio = img.width / img.height;
          const frameRatio = CONTENT_W / IMG_FRAME_H;
          let sWidth, sHeight, sx, sy;
          if (imgRatio > frameRatio) { sHeight = img.height; sWidth = sHeight * frameRatio; }  
          else { sWidth = img.width; sHeight = sWidth / frameRatio; }
          sWidth /= scale; sHeight /= scale;
          sx = (img.width - sWidth) * (card.imageTransform.x / 100);
          sy = (img.height - sHeight) * (card.imageTransform.y / 100);
          ctx.drawImage(img, sx, sy, sWidth, sHeight, CONTENT_X, currentY, CONTENT_W, IMG_FRAME_H);
          ctx.restore();
      }
      currentY += IMG_FRAME_H + PADDING;
      
      ctx.lineWidth = 2;

      ctx.fillStyle = card.colors.typeBox;
      ctx.strokeStyle = card.colors.typeBoxBorder;
      roundRect(ctx, CONTENT_X, currentY, CONTENT_W, TYPE_BOX_H, FRAME_RAD).fill();
      roundRect(ctx, CONTENT_X, currentY, CONTENT_W, TYPE_BOX_H, FRAME_RAD).stroke();
      ctx.fillStyle = card.type.color;
      ctx.font = `bold ${card.type.fontSize}px ${card.type.fontStyle}`;
      ctx.textAlign = card.type.align;
      textX = CONTENT_X + PADDING;
      if (card.type.align === 'center') textX = CONTENT_X + CONTENT_W / 2;
      if (card.type.align === 'right') textX = CONTENT_X + CONTENT_W - PADDING;
      ctx.fillText(card.type.text, textX, currentY + TYPE_BOX_H / 2);
      currentY += TYPE_BOX_H + PADDING;

      if (card.template === 'modern') {
          const ARTIST_TEXT_H = H_design * 0.05;
          const MODERN_DESC_BOX_H = DESC_BOX_H - ARTIST_TEXT_H;
          
          ctx.fillStyle = card.colors.textBox;
          ctx.strokeStyle = card.colors.titleBarBorder;
          roundRect(ctx, CONTENT_X, currentY, CONTENT_W, MODERN_DESC_BOX_H, FRAME_RAD).fill();
          roundRect(ctx, CONTENT_X, currentY, CONTENT_W, MODERN_DESC_BOX_H, FRAME_RAD).stroke();

          ctx.fillStyle = card.description.color;
          ctx.font = `${card.description.fontSize}px ${card.description.fontStyle}`;
          ctx.textBaseline = 'top';
          wrapText(ctx, card.description.text, CONTENT_X + PADDING, currentY + PADDING, CONTENT_W - PADDING * 2, card.description.fontSize * 1.2, card.description.align);
          
          const artistY = currentY + MODERN_DESC_BOX_H + (ARTIST_TEXT_H / 2);
          ctx.fillStyle = card.artistText.color;
          ctx.font = `italic ${card.artistText.fontSize}px ${card.artistText.fontStyle}`;
          ctx.textAlign = card.artistText.align;
          ctx.textBaseline = 'middle';
          textX = CONTENT_X + PADDING;
          if (card.artistText.align === 'center') textX = CONTENT_X + CONTENT_W / 2;
          if (card.artistText.align === 'right') textX = CONTENT_X + CONTENT_W - PADDING;
          ctx.fillText(card.artistText.text, textX, artistY);
          
      } else if (card.template === 'classic') {
          ctx.fillStyle = card.colors.textBox;
          ctx.strokeStyle = card.colors.titleBarBorder;
          roundRect(ctx, CONTENT_X, currentY, CONTENT_W, DESC_BOX_H, FRAME_RAD).fill();
          roundRect(ctx, CONTENT_X, currentY, CONTENT_W, DESC_BOX_H, FRAME_RAD).stroke();

          ctx.fillStyle = card.description.color;
          ctx.font = `${card.description.fontSize}px ${card.description.fontStyle}`;
          ctx.textBaseline = 'top';
          wrapText(ctx, card.description.text, CONTENT_X + PADDING, currentY + PADDING, CONTENT_W - PADDING * 2, card.description.fontSize * 1.2, card.description.align);

          const CORNER_BOX_W = CONTENT_W * 0.25;
          const CORNER_BOX_H = DESC_BOX_H * 0.3;
          const CORNER_BOX_X = CONTENT_X + CONTENT_W - CORNER_BOX_W;
          const CORNER_BOX_Y = currentY + DESC_BOX_H - CORNER_BOX_H;

          ctx.fillStyle = card.colors.cornerBox;
          ctx.strokeStyle = card.colors.cornerBoxBorder;
          roundRect(ctx, CORNER_BOX_X, CORNER_BOX_Y, CORNER_BOX_W, CORNER_BOX_H, FRAME_RAD).fill();
          roundRect(ctx, CORNER_BOX_X, CORNER_BOX_Y, CORNER_BOX_W, CORNER_BOX_H, FRAME_RAD).stroke();
          
          ctx.fillStyle = card.cornerText.color;
          ctx.font = `bold ${card.cornerText.fontSize}px ${card.cornerText.fontStyle}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(card.cornerText.text, CORNER_BOX_X + CORNER_BOX_W / 2, CORNER_BOX_Y + CORNER_BOX_H / 2);
      } else {
          const CORNER_BOX_SIZE = DESC_BOX_H * 0.25;
          const DESC_BOX_W = CONTENT_W - CORNER_BOX_SIZE - PADDING;
          ctx.fillStyle = card.colors.textBox;
          ctx.strokeStyle = card.colors.titleBarBorder;
          roundRect(ctx, CONTENT_X, currentY, DESC_BOX_W, DESC_BOX_H, FRAME_RAD).fill();
          roundRect(ctx, CONTENT_X, currentY, DESC_BOX_W, DESC_BOX_H, FRAME_RAD).stroke();
          ctx.fillStyle = card.description.color;
          ctx.font = `${card.description.fontSize}px ${card.description.fontStyle}`;
          ctx.textBaseline = 'top';
          wrapText(ctx, card.description.text, CONTENT_X + PADDING, currentY + PADDING, DESC_BOX_W - PADDING * 2, card.description.fontSize * 1.2, card.description.align);
          
          const CORNER_BOX_X = CONTENT_X + CONTENT_W - CORNER_BOX_SIZE;
          const CORNER_BOX_Y = currentY + DESC_BOX_H - CORNER_BOX_SIZE;
          ctx.fillStyle = card.colors.cornerBox;
          ctx.strokeStyle = card.colors.cornerBoxBorder;
          roundRect(ctx, CORNER_BOX_X, CORNER_BOX_Y, CORNER_BOX_SIZE, CORNER_BOX_SIZE, FRAME_RAD).fill();
          roundRect(ctx, CORNER_BOX_X, CORNER_BOX_Y, CORNER_BOX_SIZE, CORNER_BOX_SIZE, FRAME_RAD).stroke();
          ctx.fillStyle = card.cornerText.color;
          ctx.font = `bold ${card.cornerText.fontSize}px ${card.cornerText.fontStyle}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(card.cornerText.text, CORNER_BOX_X + CORNER_BOX_SIZE / 2, CORNER_BOX_Y + CORNER_BOX_SIZE / 2);
      }
    }
    
    ctx.restore();
  }, [loadedImages]);

  useEffect(() => {
    if (canvasRef.current && activeCard) {
      const canvas = canvasRef.current;
      const isVertical = activeCard.orientation === 'vertical';
      canvas.width = isVertical ? CARD_HEIGHT_PX : CARD_WIDTH_PX;
      canvas.height = isVertical ? CARD_WIDTH_PX : CARD_HEIGHT_PX;
      const ctx = canvas.getContext('2d');
      drawCardOnCanvas(ctx, activeCard, { images: loadedImages });
    }
  }, [activeCard, drawCardOnCanvas, loadedImages]);

  const updateCard = (updates) => {
    setCards(cards.map(c => c.id === activeCardId ? { ...c, ...updates } : c));
  };
  
  const addCard = () => {
    if (cards.length >= 8) return;
    const defaultTemplate = 'gameCard';
    const defaultColors = TEMPLATES[defaultTemplate].colors;
    const newCard = {
      id: nextId,
      template: defaultTemplate,
      orientation: 'vertical',
      title: { text: 'New Card', fontSize: 24, align: 'center', color: defaultColors.defaultText, fontStyle: 'Arial' },
      description: { text: 'Description', fontSize: 14, align: 'left', color: defaultColors.defaultText, fontStyle: 'Arial' },
      type: { text: 'Type', fontSize: 18, align: 'left', color: defaultColors.defaultText, fontStyle: 'Arial' },
      cornerText: { text: '', fontSize: 20, align: 'center', color: defaultColors.defaultText, fontStyle: 'Arial' },
      artistText: { text: 'Artist Name', fontSize: 12, align: 'left', color: defaultColors.defaultText, fontStyle: 'Arial' },
      footerText: { text: 'Footer Right', fontSize: 12, align: 'right', color: defaultColors.defaultText, fontStyle: 'Arial' },
      colors: { ...defaultColors },
      image: null,
      headerImage: null,
      imageTransform: { x: 50, y: 50, scale: 1 },
      headerImageTransform: { x: 50, y: 50, scale: 1 },
      outerFrameDesign: 'solid',
    };
    setCards([...cards, newCard]);
    setActiveCardId(nextId);
    setNextId(nextId + 1);
  };

  const deleteCard = (id) => {
    if (cards.length === 1) return;
    const newCards = cards.filter(c => c.id !== id);
    setCards(newCards);
    if (activeCardId === id) {
      setActiveCardId(newCards[0].id);
    }
  };

  const duplicateCard = () => {
    if (cards.length >= 8) return;
    const newCard = { ...activeCard, id: nextId, title: { ...activeCard.title, text: `${activeCard.title.text} (Copy)` }};
    setCards([...cards, newCard]);
    setActiveCardId(nextId);
    setNextId(nextId + 1);
  };

  const handleImageUpload = (e, imageType) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target.result;
        const img = new Image();
        img.onload = () => {
            setLoadedImages(prev => ({ ...prev, [imageUrl]: img }));
            if(imageType === 'header') {
                updateCard({ headerImage: imageUrl });
            } else {
                updateCard({ image: imageUrl });
            }
        };
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
    }
  };
  
  const loadAllImagesForExport = (cardsToExport) => {
    const imagePromises = cardsToExport
        .filter(card => card.image || card.headerImage)
        .flatMap(card => {
            const promises = [];
            if(card.image) promises.push(new Promise((resolve, reject) => {
                if (loadedImages[card.image] && loadedImages[card.image].complete) {
                    resolve({ url: card.image, img: loadedImages[card.image] }); return;
                }
                const img = new Image();
                img.onload = () => resolve({ url: card.image, img });
                img.onerror = () => reject(new Error(`Failed to load image for export`));
                img.src = card.image;
            }));
            if(card.headerImage) promises.push(new Promise((resolve, reject) => {
                if (loadedImages[card.headerImage] && loadedImages[card.headerImage].complete) {
                    resolve({ url: card.headerImage, img: loadedImages[card.headerImage] }); return;
                }
                const img = new Image();
                img.onload = () => resolve({ url: card.headerImage, img });
                img.onerror = () => reject(new Error(`Failed to load image for export`));
                img.src = card.headerImage;
            }));
            return promises;
        });

    return Promise.all(imagePromises).then(results => {
        const imageMap = {};
        results.forEach(result => {
            imageMap[result.url] = result.img;
        });
        return imageMap;
    });
  };

  const exportToPDF = async () => {
    if (!isPdfLibReady) {
        alert("PDF library is still loading. Please wait a moment and try again.");
        return;
    }
    setIsExporting(true);
    
    try {
      const exportImageMap = await loadAllImagesForExport(cards);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'letter'
      });
      
      const pageWidth = 215.9;
      const pageHeight = 279.4;
      const cols = 2;
      const rows = 4;
      const spacing = 5;

      const pageSlotW_mm = NFC_CARD_WIDTH_MM;
      const pageSlotH_mm = NFC_CARD_HEIGHT_MM;
      const PDF_INSET_MM = 1.5; // How much smaller the artwork is than the cut lines

      for (let i = 0; i < cards.length; i++) {
          const card = cards[i];
          const isVert = card.orientation === 'vertical';
          
          const col = i % cols;
          const row = Math.floor((i / cols) % rows);
          
          if (i > 0 && i % (cols * rows) === 0) {
            pdf.addPage();
          }

          // Calculate position for the CUT LINES
          const cutLineX = (pageWidth - (cols * pageSlotW_mm + (cols - 1) * spacing)) / 2 + col * (pageSlotW_mm + spacing);
          const cutLineY = (pageHeight - (rows * pageSlotH_mm + (rows - 1) * spacing)) / 2 + row * (pageSlotH_mm + spacing);
          
          // Calculate position and size for the IMAGE to fit INSIDE the cut lines
          const imageX = cutLineX + PDF_INSET_MM;
          const imageY = cutLineY + PDF_INSET_MM;
          const imageW = pageSlotW_mm - (PDF_INSET_MM * 2);
          const imageH = pageSlotH_mm - (PDF_INSET_MM * 2);

          const artCanvas = document.createElement('canvas');
          artCanvas.width = isVert ? CARD_HEIGHT_PX : CARD_WIDTH_PX;
          artCanvas.height = isVert ? CARD_WIDTH_PX : CARD_HEIGHT_PX;

          const artCtx = artCanvas.getContext('2d');
          drawCardOnCanvas(artCtx, card, { isExport: true, images: exportImageMap });
          
          let imgData;

          if (isVert) {
            const rotatedCanvas = document.createElement('canvas');
            rotatedCanvas.width = artCanvas.height;
            rotatedCanvas.height = artCanvas.width;
            const rotatedCtx = rotatedCanvas.getContext('2d');
            rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
            rotatedCtx.rotate(90 * Math.PI / 180);
            rotatedCtx.drawImage(artCanvas, -artCanvas.width / 2, -artCanvas.height / 2);
            imgData = rotatedCanvas.toDataURL('png');
          } else {
            imgData = artCanvas.toDataURL('png');
          }
          
          // Add the slightly smaller image to the PDF
          pdf.addImage(imgData, 'PNG', imageX, imageY, imageW, imageH);

          if (showCutLines) {
              // Draw the cut lines at their original, larger size
              pdf.setDrawColor(150, 150, 150);
              pdf.setLineWidth(0.1);
              pdf.setLineDashPattern([1, 1], 0);
              pdf.roundedRect(cutLineX, cutLineY, pageSlotW_mm, pageSlotH_mm, NFC_CARD_CORNER_RADIUS_MM, NFC_CARD_CORNER_RADIUS_MM, 'S');
              pdf.setLineDashPattern([], 0);
          }
      }

      pdf.save('nfc-cards.pdf');
    } catch (error) {
      console.error("Failed to export PDF:", error);
      alert("An error occurred during PDF export.");
    } finally {
      setIsExporting(false);
    }
  };
  
  const isVertical = activeCard?.orientation === 'vertical';
  const cardWidth = isVertical ? CARD_HEIGHT_PX : CARD_WIDTH_PX;
  const cardHeight = isVertical ? CARD_WIDTH_PX : CARD_HEIGHT_PX;
  
  return (
    <div className="h-screen bg-slate-200 flex flex-col font-sans">
      <header className="bg-slate-800 shadow-lg p-4 flex justify-between items-center flex-shrink-0">
        <h1 className="text-2xl font-bold text-slate-200">NFC Card Designer</h1>
        <button onClick={exportToPDF} disabled={isExporting || !isPdfLibReady} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:bg-gray-400">
          <Download size={20} />
          {isExporting ? 'Exporting...' : 'Export PDF'}
        </button>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-slate-800 shadow-lg overflow-y-auto">
          <div className="p-6 space-y-4">
            <SidebarSection title="General" defaultOpen={true}>
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Template</label>
                <select value={activeCard?.template} onChange={(e) => {
                    const newTemplateName = e.target.value;
                    const newTemplate = TEMPLATES[newTemplateName];
                    if (newTemplate) {
                      updateCard({
                        template: newTemplateName,
                        colors: { ...newTemplate.colors },
                      });
                    }
                  }} className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                  {Object.keys(TEMPLATES).map(key => (<option key={key} value={key}>{TEMPLATES[key].name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Orientation</label>
                <button onClick={() => updateCard({ orientation: activeCard?.orientation === 'vertical' ? 'horizontal' : 'vertical' })} className="w-full p-2 bg-slate-700 border border-slate-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-slate-600">
                  <FlipHorizontal size={20} /> {activeCard?.orientation === 'vertical' ? 'Vertical' : 'Horizontal'}
                </button>
              </div>
            </SidebarSection>

            <SidebarSection title="Text & Typography">
              { activeCard?.template === 'steamRetro' || activeCard?.template === 'gameCard' ? (
                <>
                  <TextControl label="Header Left Text" value={activeCard?.type} onUpdate={(val) => updateCard({ type: val })} />
                  <TextControl label="Header Right Text" value={activeCard?.cornerText} onUpdate={(val) => updateCard({ cornerText: val })} />
                  <TextControl label="Header Sub-Text" value={activeCard?.description} onUpdate={(val) => updateCard({ description: val })} />
                  {activeCard?.template === 'steamRetro' && (
                    <>
                      <TextControl label="Footer Center Text" value={activeCard?.artistText} onUpdate={(val) => updateCard({ artistText: val })} />
                      <TextControl label="Footer Right Text" value={activeCard?.footerText} onUpdate={(val) => updateCard({ footerText: val })} />
                    </>
                  )}
                </>
              ) : (
                <>
                  <TextControl label="Title Text" value={activeCard?.title} onUpdate={(val) => updateCard({ title: val })} />
                  <TextControl label="Type Text" value={activeCard?.type} onUpdate={(val) => updateCard({ type: val })} />
                  <TextControl label="Description Text" value={activeCard?.description} onUpdate={(val) => updateCard({ description: val })} />
                  {activeCard?.template !== 'modern' &&
                    <TextControl label="Corner Text" value={activeCard?.cornerText} onUpdate={(val) => updateCard({ cornerText: val })} />
                  }
                  {activeCard?.template === 'modern' &&
                    <TextControl label="Artist Text" value={activeCard?.artistText} onUpdate={(val) => updateCard({ artistText: val })} />
                  }
                </>
              )}
            </SidebarSection>
            
            <SidebarSection title="Artwork & Style">
              {(activeCard?.template === 'steamRetro' || activeCard?.template === 'gameCard') && (
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Header Image</label>
                  <input ref={headerFileInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'header')} className="hidden"/>
                  <button onClick={() => headerFileInputRef.current?.click()} className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white hover:bg-slate-600">
                    {activeCard?.headerImage ? 'Change Header Image' : 'Upload Header Image'}
                  </button>
                  {activeCard?.headerImage && (
                    <div className="mt-4">
                      <label className="block text-sm text-slate-400 mb-1">Header Zoom</label>
                      <input type="range" min="1" max="5" step="0.1" value={activeCard.headerImageTransform.scale} onChange={(e) => updateCard({ headerImageTransform: { ...activeCard.headerImageTransform, scale: parseFloat(e.target.value) }})} className="w-full"/>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Frame Design</label>
                <select value={activeCard?.outerFrameDesign} onChange={(e) => updateCard({ outerFrameDesign: e.target.value })} className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                  <option value="solid">Solid Color</option>
                  <option value="wateryBlue">Watery Blue</option>
                  <option value="crackedDesert">Cracked Desert</option>
                  <option value="lavaFlow">Lava Flow</option>
                  <option value="sandy">Sandy</option>
                  <option value="galaxy">Galaxy</option>
                  <option value="holographicShimmer">Holographic Shimmer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Main Image</label>
                <input ref={mainFileInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'main')} className="hidden"/>
                <button onClick={() => mainFileInputRef.current?.click()} className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white hover:bg-slate-600">
                  {activeCard?.image ? 'Change Main Image' : 'Upload Main Image'}
                </button>
                {activeCard?.image && (
                  <div className="mt-4">
                    <label className="block text-sm text-slate-400 mb-1">Zoom: {activeCard.imageTransform.scale.toFixed(2)}x</label>
                    <input type="range" min="1" max="5" step="0.1" value={activeCard.imageTransform.scale} onChange={(e) => updateCard({ imageTransform: { ...activeCard.imageTransform, scale: parseFloat(e.target.value) }})} className="w-full"/>
                    <label className="block text-sm text-slate-400 mb-1 mt-2">Position X</label>
                    <input type="range" min="0" max="100" step="1" value={activeCard.imageTransform.x} onChange={(e) => updateCard({ imageTransform: { ...activeCard.imageTransform, x: parseInt(e.target.value) }})} className="w-full"/>
                    <label className="block text-sm text-slate-400 mb-1 mt-2">Position Y</label>
                    <input type="range" min="0" max="100" step="1" value={activeCard.imageTransform.y} onChange={(e) => updateCard({ imageTransform: { ...activeCard.imageTransform, y: parseInt(e.target.value) }})} className="w-full"/>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-700">
                  <label className="block text-sm font-semibold text-slate-200">Card Colors</label>
                  {Object.entries(activeCard?.colors || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <label className="text-sm text-slate-400 w-28 capitalize flex-shrink-0">{key.replace(/([A-Z])/g, ' $1')}</label>
                      <input type="color" value={value} onChange={(e) => updateCard({ colors: { ...activeCard.colors, [key]: e.target.value }})} className="w-full h-8 rounded border-none cursor-pointer bg-slate-700"/>
                    </div>
                  ))}
              </div>
            </SidebarSection>
            
            <SidebarSection title="Export Settings">
              <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showCutLines} onChange={(e) => setShowCutLines(e.target.checked)} className="w-4 h-4 rounded text-blue-500 bg-slate-600 border-slate-500"/>
                  <span className="text-sm font-semibold text-slate-200">Show Cut Lines</span>
              </label>
            </SidebarSection>
          </div>
        </aside>
        <main className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-300 overflow-hidden">
            <div
              className="max-w-full max-h-full object-contain p-1"
              style={{
                border: showCutLines ? '1px dashed #888' : 'none',
                backgroundColor: showCutLines ? '#fff' : 'transparent',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                width: cardWidth,
                height: cardHeight,
                borderRadius: `${CARD_CORNER_RADIUS_PX}px`,
              }}
            >
              <canvas
                  ref={canvasRef}
                  className="w-full h-full"
              />
            </div>
        </main>
      </div>
      <footer className="bg-slate-800 border-t border-slate-700 p-4 flex-shrink-0">
        <div className="flex items-center gap-4 overflow-x-auto pb-2">
          <button onClick={addCard} disabled={cards.length >= 8} className="flex-shrink-0 w-24 h-36 border-2 border-dashed border-slate-500 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 hover:bg-slate-700 disabled:opacity-50">
            <Plus size={24} />
            <span className="text-xs mt-1">Add Card</span>
          </button>
          {cards.map((card) => (
            <div key={card.id} className={'relative flex-shrink-0 cursor-pointer rounded-lg ' + (card.id === activeCardId ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-blue-500' : 'ring-1 ring-slate-600')} onClick={() => setActiveCardId(card.id)}>
              <div className="w-24 h-36 bg-cover bg-center rounded-lg overflow-hidden flex flex-col justify-between p-1 text-white text-shadow-sm" style={{ backgroundColor: card.colors.border }}>
                 <div className="p-1 text-xs text-center font-bold truncate" style={{ color: card.title.color, backgroundColor: card.colors.titleBar, borderRadius: '4px' }}>
                  {card.title.text}
                </div>
              </div>
              <div className="absolute top-1 right-1 flex flex-col gap-1">
                <button onClick={(e) => { e.stopPropagation(); setActiveCardId(card.id); duplicateCard(); }} className="bg-slate-100 rounded-full p-1 shadow hover:bg-slate-200 disabled:opacity-50" disabled={cards.length >= 8} >
                  <Copy size={12} />
                </button>
                {cards.length > 1 && (
                  <button onClick={(e) => { e.stopPropagation(); deleteCard(card.id); }} className="bg-slate-100 rounded-full p-1 shadow hover:bg-red-200">
                    <Trash2 size={12} className="text-red-600" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="flex-shrink-0 text-sm font-medium text-slate-400 ml-2">
            {cards.length} / 8 cards
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

