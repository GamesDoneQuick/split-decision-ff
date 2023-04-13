import React, { useMemo } from 'react';
import styled from 'styled-components';
import { Event } from '@prisma/client';
import Link from 'next/link';
import { SiteConfig } from '../utils/siteConfig';

interface ToolkitPage {
  id: string;
  name: string | ((event: Event) => string);
  link: string;
}
const TOOLKIT_PAGES: ToolkitPage[] = [
  {
    id: 'submissions',
    name: 'Submissions',
    link: '',
  },
  {
    id: 'availability',
    name: 'Availability',
    link: '/committee/availability',
  },
];

interface CommitteeToolbarProps {
  isCommitteeMember: boolean;
  event: Event;
  children: React.ReactNode | React.ReactNode[];
  activePage: string;
  className?: string;
}

function getToolkitPageName(page: ToolkitPage | undefined, event: Event) {
  if (!page) return 'Committee Toolkit';

  if (typeof page.name === 'string') return page.name;

  return page.name(event);
}

export const CommitteeToolbar: React.FC<CommitteeToolbarProps> = ({ children, isCommitteeMember, event: eventRecord, activePage, className }) => {
  const [activeOption, dropdownOptions] = useMemo(() => [
    TOOLKIT_PAGES.find(item => item.id === activePage),
    TOOLKIT_PAGES.filter(item => item.id !== activePage),
  ], [activePage]);

  if (!isCommitteeMember) return null;

  return (
    <Container className={className}>
      <ToolkitDropdownButton>
        <span>{getToolkitPageName(activeOption, eventRecord)}</span>
        <ToolkitDropdown>
          {dropdownOptions.map(option => (
            <Link key={option.id} href={`/event/${eventRecord.id}${option.link}`}>
              <ToolkitLink>{getToolkitPageName(option, eventRecord)}</ToolkitLink>
            </Link>
          ))}
        </ToolkitDropdown>
      </ToolkitDropdownButton>
      {children}
    </Container>
  );
};

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 3.5rem;
  font-size: 1rem;
  font-weight: 700;
  margin: 0 -1rem;
  padding: 0 1rem;
  background-color: ${SiteConfig.colors.accents.separator};
  border-bottom: 1px solid ${SiteConfig.colors.primary};
`;

const ToolkitDropdown = styled.div`
  position: absolute;
  bottom: 0;
  left: -0.5rem;
  width: calc(100% + 1rem);
  display: none;
  flex-direction: column;
  transform: translateY(100%);
  background-color: ${SiteConfig.colors.accents.separator};
  border: 1px solid ${SiteConfig.colors.primary};
  border-top: 0;
`;

const ToolkitDropdownButton = styled.div`
  position: relative;
  display: flex;
  height: 100%;
  padding: 0 1.25rem 0 0.25rem;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  overflow: visible;
  z-index: 3;

  &:after {
    content: ' ';
    position: absolute;
    right: 0.25rem;
    top: 50%;
    border-top: 0.25rem solid ${SiteConfig.colors.text.light};
    border-left: 0.25rem solid transparent;
    border-right: 0.25rem solid transparent;
    transform: translateY(-50%);
  }

  &:hover ${ToolkitDropdown} {
    display: flex;
  }
`;

const ToolkitLink = styled.a`
  display: inline-block;
  width: 100%;
  text-align: center;
  padding: 1rem 0.5rem;
  transition: background-color 100ms ease-in;
  cursor: pointer;

  &:hover,
  &:active {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;
