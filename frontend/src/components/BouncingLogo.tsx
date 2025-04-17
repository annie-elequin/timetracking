import React, { useEffect, useState, useRef } from 'react';
import './BouncingLogo.css';

const SHAPES = ['circle', 'square', 'triangle', 'star', 'dog-image', 'joy-word'];

const JOY_WORDS = [
  // Modern/Internet Era
  'yolo', 'woo', 'yay', 'omg', 'lol', 'woohoo', 'yeet', 'poggers', 'lets go', 'vibe',
  // Classic/Retro
  'groovy', 'rad', 'awesome', 'cool beans', 'tubular', 'far out', 'righteous', 'stellar',
  // Historical
  'huzzah', 'hurrah', 'hoorah', 'hail', 'forsooth', 'egad', 'zounds', 'gadzooks',
  // Fantasy/Fiction
  'bazinga', 'cowabunga', 'kapow', 'booyah', 'wahoo', 'geronimo', 'allons-y', 'excelsior',
  'alakazam', 'shazam', 'eureka', 'great scott', 'wubba lubba', 'spiffing', 'wizard',
  // Enthusiastic
  'wowza', 'yahoo', 'yeehaw', 'aww yeah', 'hot dog', 'oh snap', 'zing', 'bam', 'pow',
  // Magical
  'abracadabra', 'bibbidi', 'expecto', 'lumos', 'alohomora', 'leviosa', 'mischief managed',
  // Gaming
  'gg', 'ez', 'pwned', 'epic', 'legendary', 'victory royale', 'critical hit', '1up',
  // Anime/Manga
  'sugoi', 'kawaii', 'nani', 'plus ultra', 'dattebayo', 'ora ora', 'muda muda',
  // Misc Fun
  'booyakasha', 'kachow', 'shabam', 'shazoom', 'kaboom', 'zing', 'biff', 'pow', 'zap',
  'whoosh', 'zoom', 'zing', 'bam', 'kapow', 'boom', 'pew pew', 'swoosh', 'vroom'
];

const BouncingLogo: React.FC = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [velocity, setVelocity] = useState({ x: 4, y: 4 });
  const [isHovered, setIsHovered] = useState(false);
  const [confetti, setConfetti] = useState<Array<{
    x: number;
    y: number;
    color: string;
    angle: number;
    scale: number;
    speed: number;
    shape: string;
    tx: number;
    ty: number;
    tilt?: number;
    text?: string;
    finalRotation?: number;
  }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const confettiTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const confettiColors = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
    '#ff8800', '#ff0088', '#00ff88', '#8800ff', '#88ff00', '#0088ff'
  ];

  useEffect(() => {
    const container = containerRef.current;
    const logo = logoRef.current;
    if (!container || !logo) return;

    const animate = () => {
      if (isHovered) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      setPosition(prev => {
        const containerRect = container.getBoundingClientRect();
        const logoRect = logo.getBoundingClientRect();
        let newX = prev.x + velocity.x;
        let newY = prev.y + velocity.y;
        let newVelocityX = velocity.x;
        let newVelocityY = velocity.y;

        if (newX <= 0 || newX + logoRect.width >= containerRect.width) {
          newVelocityX = -velocity.x;
        }
        if (newY <= 0 || newY + logoRect.height >= containerRect.height) {
          newVelocityY = -velocity.y;
        }

        setVelocity({ x: newVelocityX, y: newVelocityY });
        return {
          x: Math.max(0, Math.min(newX, containerRect.width - logoRect.width)),
          y: Math.max(0, Math.min(newY, containerRect.height - logoRect.height))
        };
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [velocity, isHovered]);

  // Function to teleport to a random position
  const teleportToRandomPosition = () => {
    if (!containerRef.current || !logoRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const logoRect = logoRef.current.getBoundingClientRect();
    
    const newX = Math.random() * (containerRect.width - logoRect.width);
    const newY = Math.random() * (containerRect.height - logoRect.height);
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    createConfetti();
    
    // Clear any existing timeout
    if (confettiTimeoutRef.current) {
      clearTimeout(confettiTimeoutRef.current);
    }
    
    // Set a timeout to teleport and reset hover state
    confettiTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setConfetti([]); // Clear confetti
      teleportToRandomPosition();
    }, 1000); // Teleport after 1 second
  };

  const handleMouseLeave = () => {
    // Remove this as we'll handle it in the timeout
    // setIsHovered(false);
    // setConfetti([]);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (confettiTimeoutRef.current) {
        clearTimeout(confettiTimeoutRef.current);
      }
    };
  }, []);

  const createConfetti = () => {
    const regularConfetti = Array.from({ length: 150 }, () => {
      const angle = (Math.random() * Math.PI * 2);
      const velocity = 100 + Math.random() * 200;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;

      return {
        x: position.x + (Math.random() * 150),
        y: position.y + (Math.random() * 150),
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        angle: Math.random() * 360,
        scale: 0.5 + Math.random(),
        speed: 0.8 + Math.random() * 0.4,
        shape: SHAPES.slice(0, -2)[Math.floor(Math.random() * (SHAPES.length - 2))],
        tx,
        ty
      };
    });

    // Create one special spiraling dog
    const baseAngle = Math.random() * Math.PI * 2;
    const baseVelocity = 150 + Math.random() * 250;
    const spiralDog = {
      x: position.x + (Math.random() * 150),
      y: position.y + (Math.random() * 150),
      color: 'transparent',
      angle: Math.random() * 360,
      scale: 0.15,
      speed: 4,
      shape: 'dog-image',
      tx: Math.cos(baseAngle) * baseVelocity * (1 + Math.random() * 0.5),
      ty: Math.sin(baseAngle) * baseVelocity * (1 + Math.random() * 0.5),
      finalRotation: 720 + Math.random() * 720
    };

    // Create one special word
    const wordAngle = Math.random() * Math.PI * 0.5 - Math.PI * 0.25; // -45 to +45 degrees
    const wordVelocity = 200 + Math.random() * 300;
    const joyWord = {
      x: position.x + (Math.random() * 150),
      y: position.y + (Math.random() * 150),
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      angle: 0,
      scale: 1,
      speed: 3,
      shape: 'joy-word',
      tx: Math.cos(wordAngle) * wordVelocity,
      ty: Math.sin(wordAngle) * wordVelocity,
      tilt: -15 + Math.random() * 30, // Random tilt between -15 and +15 degrees
      text: JOY_WORDS[Math.floor(Math.random() * JOY_WORDS.length)]
    };

    // Keep only regular confetti from before plus the new ones
    const oldConfetti = confetti.filter(p => p.shape !== 'dog-image' && p.shape !== 'joy-word');
    setConfetti([...oldConfetti.slice(-300), ...regularConfetti, spiralDog, joyWord]);
  };

  return (
    <div ref={containerRef} className="bouncing-container">
      <div
        ref={logoRef}
        className={`bouncing-logo ${isHovered ? 'hovered' : ''}`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) ${isHovered ? 'scaleX(1)' : ''}`,
          transition: isHovered ? 'none' : 'transform 0.2s ease' // Add smooth transition except during hover
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <img src="/dog.png" alt="Bouncing Dog" />
      </div>
      {confetti.map((particle, index) => (
        <div
          key={`${index}-${particle.x}-${particle.y}`}
          className={`confetti ${particle.shape} ${
            particle.shape === 'dog-image' ? 'spiral-animation' : 
            particle.shape === 'joy-word' ? 'word-animation' : 
            'confetti-animation'
          }`}
          style={{
            left: particle.x,
            top: particle.y,
            borderBottomColor: particle.color,
            backgroundColor: particle.color,
            transform: `rotate(${particle.angle}deg) scale(${particle.scale})`,
            animationDuration: `${particle.speed}s`,
            '--tx': `${particle.tx}px`,
            '--ty': `${particle.ty}px`,
            '--tilt': particle.tilt ? `${particle.tilt}deg` : undefined,
            '--final-rotation': particle.finalRotation ? `${particle.finalRotation}deg` : undefined,
            backgroundImage: particle.shape === 'dog-image' ? 'url(/dog.png)' : 'none',
            ...(particle.shape === 'joy-word' ? { '--color': particle.color } : {}),
          } as React.CSSProperties}
        >
          {particle.shape === 'joy-word' && particle.text}
        </div>
      ))}
    </div>
  );
};

export default BouncingLogo; 