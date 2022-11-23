import React, { useState } from 'react';
import styled from 'styled-components';
import { useOnMount } from '../utils/hooks';

interface ErrorDisplayProps {
  title: string;
  descriptions: string[];
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ title, descriptions }) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useOnMount(() => {
    setSelectedIndex(Math.floor(Math.random() * descriptions.length));
  })

  return (
    <Container>
      <ErrorFaith />
      <h1>{title}</h1>
      <p>{descriptions[selectedIndex]}</p>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  color: #fff;
`;

const ErrorFaith = styled.div`
  background-image: url('/images/Faith-404.png');
  width: 100%;
  height: 400px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
`;
