import React, { useCallback } from 'react';
import styled from 'styled-components';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { EventList } from '../components/EventList';
import { SiteConfig } from '../utils/siteConfig';

const Home: NextPage = () => {
  const router = useRouter();
  
  const navigateToEvent = useCallback((id: string) => {
    router.push(`/event/${id}`);
  }, [router]);

  return (
    <Container>
      <Head>
        <title>{SiteConfig.siteName}</title>
        <meta name="description" content="faithPop" />
        <link rel="icon" href={SiteConfig.favicon} />
      </Head>
      <EventsColumn>
        <EventList onClick={navigateToEvent} />
      </EventsColumn>
      <LoginColumn>
        {SiteConfig.heroImage && <HeroImage src={SiteConfig.heroImage} />}

        <WelcomeMessage>
          Welcome to the {SiteConfig.organizationName} event submission manager!
        </WelcomeMessage>
        <WelcomeDetails>
          You must be a member of the {SiteConfig.organizationName} community to submit to our events.
          You can DM us on&nbsp;
          <a href="https://twitter.com/framefatales" target="_blank" rel="noopener noreferrer">Twitter</a> or&nbsp;
          <a href="https://instagram.com/gamesdonequick" target="_blank" rel="noopener noreferrer">Instagram</a>, or email<span> </span>
          <a href="mailto:framefatales@gamesdonequick.com">framefatales@gamesdonequick.com</a> to join.
        </WelcomeDetails>
      </LoginColumn>
    </Container>
  );
};

export default Home;

const Container = styled.div`
  display: flex;
  max-height: 100%;
  flex-direction: row;
  overflow-y: auto;
  color: #fff;

  @media screen and (max-width: 500px) {
    flex-direction: column-reverse;
  }
`;

const EventsColumn = styled.div`
  min-width: 0;
  flex-grow: 1;
  align-self: stretch;
  padding: 1rem;
  flex-basis: 2;
`;

const LoginColumn = styled.div`
  padding: 1rem;
  flex-basis: 0;
`;

const HeroImage = styled.div<{ src: string }>`
  width: 600px;
  height: 400px;
  background-image: url(${({ src }) => src});
  background-size: cover;

  @media screen and (max-width: 600px) {
    width: 100%;
    height: auto;
    background-position: center top;
    background-size: 100% auto;
    box-sizing: content-box;
    padding-bottom: 66%;
  }
`;

const WelcomeMessage = styled.h1`
  margin: 1rem 0;
  text-align: center;
`;

const WelcomeDetails = styled.p`
  font-size: 1.25rem;
  text-align: center;

  & a {
    color: ${SiteConfig.colors.accents.link};
    text-decoration: underline;
  }
`;
