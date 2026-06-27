import React, { useRef, useState } from 'react';

export default function TiltedCard({
  children,
  className = '',
  maxRotation = 8,
  perspective = 1000,
  scale = 1.015,
  ...props
}) {
  const cardRef = useRef(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;

    const rX = -(mouseY / (height / 2)) * maxRotation;
    const rY = (mouseX / (width / 2)) * maxRotation;

    setRotate({ x: rX, y: rY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-300 ease-out ${className}`}
      style={{
        transform: `perspective(${perspective}px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale(${rotate.x || rotate.y ? scale : 1}) translateZ(0)`,
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
        transformStyle: 'preserve-3d',
      }}
      {...props}
    >
      {children}
    </div>
  );
}
