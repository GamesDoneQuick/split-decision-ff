import React from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import { Alert, Anchor } from './layout';
import { UserWithVettingInfo } from '../utils/models';

interface VettingInfoAlertProps {
  user: UserWithVettingInfo;
}

export const VettingInfoAlert: React.FC<VettingInfoAlertProps> = ({ user }) => {
  if (user.vettingInfo) return null;

  return (
    <Container variant="error">
      You must fill out your&nbsp;
      <Link href="/profile/info">
        <Anchor>
          runner info
        </Anchor>
      </Link>&nbsp;before submitting to Frame Fatales events.
    </Container>
  );
};

const Container = styled(Alert)`
  margin-top: 0.5rem;
`;
