import React from 'react';
import styled from 'styled-components';
import type { NextPage } from 'next';
import Head from 'next/head';
import { SiteConfig } from '../utils/siteConfig';

const Home: NextPage = () => (
  <Container>
    <Head>
      <title>{SiteConfig.siteName}</title>
      <meta name="description" content="faithPop" />
      <link rel="icon" href={SiteConfig.favicon} />
    </Head>
    <BigMessage>
      faith ate the old site
    </BigMessage>
    <BigMessage>
      <a href="https://submissions.gamesdonequick.com">go here</a>
    </BigMessage>
    <SmallMessage>
      your old submissions are in the top left corner btw
    </SmallMessage>
  </Container>
);

export default Home;

const Container = styled.div`
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  max-height: 100%;
  overflow-y: auto;
  color: #fff;
`;

const BigMessage = styled.h1`
  font-size: 5rem;
  margin: 1rem 0;

  &  a {
    text-decoration: underline;
    color: #a9c4ff;
  }
`;

const SmallMessage = styled.h2`
  font-size: 2rem;
`;
