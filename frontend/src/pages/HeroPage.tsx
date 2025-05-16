import React from 'react';
import { useParams } from 'react-router-dom';

const HeroPage: React.FC = () => {
  const { heroId } = useParams<{ heroId: string }>();
  
  return (
    <div>
      <h1>Hero Page</h1>
      <p>Hero ID: {heroId}</p>
    </div>
  );
};

export default HeroPage;
