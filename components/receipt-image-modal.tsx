import React from "react";
import Image from "next/image";
import { X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ReceiptImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  description: string;
}

export const ReceiptImageModal: React.FC<ReceiptImageModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  description,
}) => {
  const [scale, setScale] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);

  if (!isOpen) return null;

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => prev + 90);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 md:p-10"
        onClick={onClose}
      >
        <div className="absolute top-6 right-6 flex items-center gap-4 z-[110]">
          <div className="flex bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/10">
            <button
              onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              title="Zoom Out"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              title="Zoom In"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleRotate(); }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              title="Rotate"
            >
              <RotateCw className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full transition-colors text-white border border-white/10"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-full max-h-full flex items-center justify-center pointer-events-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="transition-transform duration-200 ease-out flex items-center justify-center"
            style={{ 
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              pointerEvents: 'auto'
            }}
          >
            <div className="relative max-w-[90vw] max-h-[85vh] w-full h-[85vh] min-h-[200px]">
              <Image
                src={imageUrl}
                alt={description}
                fill
                className="object-contain rounded-lg shadow-2xl"
                style={{ cursor: scale > 1 ? "grab" : "default" }}
                unoptimized
              />
            </div>
          </div>
        </motion.div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/80 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
          <p className="text-sm font-medium">{description}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
