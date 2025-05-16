import React, { useEffect, useRef, useState } from 'react';

interface HeroSpriteProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  isMoving: boolean;
  spriteSheet: string;
  frameCount?: number;
  frameDuration?: number; // ms
}

const HeroSprite: React.FC<HeroSpriteProps> = ({
  x,
  y,
  width = 32,
  height = 32,
  isMoving,
  spriteSheet,
  frameCount = 6,
  frameDuration = 120,
}) => {
  const [frame, setFrame] = useState(0);
  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    let animationId: number;
    function animate() {
      if (isMoving) {
        const now = Date.now();
        if (now - lastUpdateRef.current > frameDuration) {
          setFrame((prev) => (prev + 1) % frameCount);
          lastUpdateRef.current = now;
        }
      } else {
        setFrame(0);
      }
      animationId = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [isMoving, frameCount, frameDuration]);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        pointerEvents: 'none',
        imageRendering: 'pixelated',
        zIndex: 10,
      }}
    >
      <div
        style={{
          width,
          height,
          backgroundImage: `url(${spriteSheet})`,
          backgroundPosition: `-${frame * width}px 0px`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${width * frameCount}px ${height}px`,
        }}
      />
    </div>
  );
};

export default HeroSprite;
