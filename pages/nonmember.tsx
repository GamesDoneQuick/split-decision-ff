import React from 'react';
import styled from 'styled-components';
import type { NextPage } from 'next';
import { SiteConfig } from '../utils/siteConfig';

const NonMemberError: NextPage = () => (
  <div>
    <HeroImage />

    <ErrorMessage>
      You need to be a member of the {SiteConfig.organizationName} Discord in order to log in.
    </ErrorMessage>
  </div>
);

export default NonMemberError;

const HeroImage = styled.div`
  width: 600px;
  height: 400px;
  margin: 1rem auto 0;
  background-image: url("images/frazzled.png");
  background-size: cover;
`;

const ErrorMessage = styled.h1`
  color: ${SiteConfig.colors.text.light};
  text-align: center;  
`;
