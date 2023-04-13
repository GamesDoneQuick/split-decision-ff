import React from 'react';
import styled from 'styled-components';
import { SiteConfig } from '../utils/siteConfig';
import { Button } from './layout';

interface TabOption {
  value: string;
  label: string;
}

interface TabSidebarProps {
  options: TabOption[];
  onChange: (value: string) => void;
  value: string;
}

export const TabSidebar: React.FC<TabSidebarProps> = ({ options, onChange, value: selectedValue }) => (
  <Container>
    {options.map(({ value, label }) => (
      <Tab key={value} onClick={() => onChange(value)} isActive={selectedValue === value}>
        {label}
      </Tab>
    ))}
  </Container>
);

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: ${SiteConfig.colors.secondary};
  border-right: 1px solid ${SiteConfig.colors.primary};

  @media screen and (max-width: 800px) {
    flex-direction: row;
    height: max-content;
    width: 100%;
    border-right: none;
    border-bottom: 1px solid ${SiteConfig.colors.primary};

  }
`;

const Tab = styled(Button)<{ isActive: boolean }>`
  background-color: ${({ isActive }) => isActive ? SiteConfig.colors.primary : 'transparent'};
  color: ${SiteConfig.colors.text.primary};
  border-radius: 0;
  text-align: right;
  padding: 1.5rem 1rem 1.5rem 2.5rem;

  @media screen and (max-width: 800px) {
    padding: 1rem;
    text-align: center;
    flex-grow: 1;
    min-width: 0;
  }

  &&:hover,
  &&:active {
    background-color: ${({ isActive }) => isActive ? SiteConfig.colors.primary : 'rgba(255, 255, 255, 0.1)'};
  }
`;
