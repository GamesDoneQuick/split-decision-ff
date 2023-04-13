/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback } from 'react';
import styled from 'styled-components';
import { SessionProvider, signIn, useSession } from 'next-auth/react';
import type { AppProps } from 'next/app';
import Link from 'next/link';
import { DefaultSeo } from 'next-seo';
import { Button, GlobalStyle } from '../components/layout';
import { SiteConfig } from '../utils/siteConfig';

import '../styles/globals.css';

const HeaderActions: React.FC = () => {
  const session = useSession();

  const discordLogin = useCallback(() => {
    signIn('discord', { callbackUrl: '/profile' });
  }, []);
  
  const isLoggedIn = session.status === 'authenticated';

  return (
    <HeaderActionsContainer>
      {!isLoggedIn && <LoginButton onClick={discordLogin}>Log In with Discord</LoginButton>}
      {isLoggedIn && (
        <Link href="/profile">
          <a><LoginButton>Submission Manager</LoginButton></a>
        </Link>
      )}
    </HeaderActionsContainer>
  );
};

function SubmissionsApp({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={(pageProps as any).session}>
      <Container>
        <GlobalStyle />
        <DefaultSeo
          description={SiteConfig.siteDescription}
          canonical={process.env.NEXTAUTH_URL}
          title={SiteConfig.siteName}
          openGraph={{
            type: 'website',
            locale: 'en_US',
            url: process.env.NEXTAUTH_URL,
            site_name: SiteConfig.siteName,
            description: SiteConfig.siteDescription,
            title: SiteConfig.siteName,
            images: [
              {
                url: SiteConfig.embedImage,
                width: 1200,
                height: 627,
                alt: SiteConfig.siteDescription,
                type: 'image/png',
              },
            ],
          }}
          twitter={{
            cardType: 'summary_large_image',
          }}
        />
        <Header>
          <Link href="/">
            <a>{SiteConfig.siteName || 'Submissions'}</a>
          </Link>
          <HeaderActions />
        </Header>
        <PageContent>
          <Component {...pageProps} />
        </PageContent>
      </Container>
    </SessionProvider>
  );
}

export default SubmissionsApp;

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;

  & .selector__option {
    color: ${SiteConfig.colors.text.dark};
  }

  & .selector__control {
    background-color: ${SiteConfig.colors.input.background};
    color: ${SiteConfig.colors.input.text};
    border: 1px solid ${SiteConfig.colors.input.border};
  }

  & .selector__single-value {
    color: ${SiteConfig.colors.input.text};
  }

  & .selector__indicator-separator {
    background-color: ${SiteConfig.colors.input.border};
  }

  & .selector__dropdown-indicator svg {
    color: ${SiteConfig.colors.input.text};
  }
`;

const Header = styled.div`
  display: flex;
  padding: 0.5rem 1rem;
  background-color: ${SiteConfig.colors.accents.header};
  color: ${SiteConfig.colors.text.light};
  font-size: 1.5rem;
  align-items: center;
  font-family: 'Lexend';

  @media screen and (max-width: 500px) {
    a {
      font-size: 1.25rem;
    }
  }
`;

const HeaderActionsContainer = styled.div`
  margin-left: auto;
`;

const PageContent = styled.div`
  min-height: 0;
  align-self: stretch;
  flex-grow: 1;
  overflow-y: auto;
`;

const LoginButton = styled(Button)`
  font-size: 1rem;
  padding: 0.5rem 1.5rem;
`;
