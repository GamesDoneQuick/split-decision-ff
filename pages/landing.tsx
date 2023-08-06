import React from 'react';
import styled from 'styled-components';
import { NextPage } from 'next';
import { SiteConfig } from '../utils/siteConfig';

const Landing: NextPage = () => (
  <Container>
    <Logo />

    <h2>Flame Fatales 2023 preparations are heating up!</h2>
    <p>
      Flame Fatales 2023 will run from August 13 - August 20, benefiting Malala Fund. The games schedule is live now! This event runs daily from 1PM to around 1AM Eastern, featuring over 60 unique speedruns and members of the Fatales community.
    </p>
    <p>
      Studio Volunteer applications and Remote Volunteer applications are now closed. We had over 125 applications submitted, thank you to everyone who wants to help with the event! Volunteer acceptances and decline emails will be sent on July 13.
    </p>
    <p>
      Prize submissions for Flame Fatales are open now until August 6! Anyone is able to submit prizes, not just members of the Frame Fatales community. We thank everyone in advance for submitting prizes to the event and donating your time and talent.
    </p>

    <h2>Frost Fatales 2023 reaches a new Frame Fatales donation record!</h2>
    <TwoColumn>
      <TeamPhoto />
      <div>
        <p>
          Frost Fatales 2023 concluded with a record total of $153, 352.28 raised for Malala Fund! Thank you to all who participated and watched the event, especially all those working at the GDQ Studio. You can watch all of the Frame Fatales speedruns at the Frost Fatales 2023 playlist on our Youtube.
        </p>
        <p>
          Our next charity event will be Flame Fatales 2023 from August 13-20. For information about run submissions and volunteering, be sure to stay up to date with the Games Done Quick Twitter and Frame Fatales Twitter for updates, or join our Discord.
        </p>
      </div>
    </TwoColumn>

    <h2>The Frame Fatales community</h2>
    <p>
      We have a server focused on comradery, helping each other with tech and speedrunning, and sharing information about speedrunning events and opportunities.
    </p>

    <h3>Game of the Month</h3>
    <p>
      Every two months, we vote on a Game of the Month as a community! The first month involves casually playing the game together, then the second month we collect resources and learn the speedrun with the help of an experienced GOTM Game Guide. Past games have included Stardew Valley, Celeste, Hades, Waluigi&apos;s Taco Stand, and more!
    </p>

    <h3>Randomizer events</h3>
    <p>
      The randomizers channel is an extremely active subset of the Frame Fatales Discord. Members organize weekly randomizer seeds of various games the community wants to play together, in addition to running tutorials to help newcomers. There is also a monthly asynchronous Archipelago Multiworld, where members select from a growing pool of unique games, swap checks between them all, and work together to complete every game!
    </p>

    <h3>Marathons</h3>
    <p>
      Frame Fatales typically has two events per year, with Frost Fatales occurring in February/March, and Flame Fatales in August. Past videos from Frame Fatales events can be found on the&nbsp;
      <a href="https://youtube.com/gamesdonequick" target="_blank" rel="noreferrer">Games Done Quick Youtube channel</a>.
    </p>

    <h2>Who can join?</h2>
    <p>
      Frame Fatales is an all-women community for those who participate in and are interested in speedrunning, charity events, and gaming. It is a space for you if you identify as a woman in any way that is meaningful to you. All women - cis, trans, nonbinary, and gender non-conforming! - are welcome to join.
    </p>

    <h2>How do I join?</h2>
    <p>
      If you would like to join the Frame Fatales Discord server, please send a DM to the&nbsp;
      <a href="https://www.instagram.com/gamesdonequick" target="_blank" rel="noreferrer">Games Done Quick Instagram account</a>, or send an email to&nbsp;
      <a href="mailto:framefatales@gamesdonequick.com">framefatales@gamesdonequick.com</a>.
    </p>
  </Container>
);

export default Landing;

const Container = styled.div`
  display: flex;
  max-width: 1200px;
  margin: 0 auto;
  flex-direction: column;
  align-items: center;
  color: #fff;
  padding: 4rem;

  & h1 {
    font-size: 4rem;
  }

  & h2 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    text-align: center;

    & + p {
      margin-top: 0;
    }
  }
  
  & h3 {
    font-size: 1.75rem;
    margin-bottom: 0.75rem;
  }

  & p {
    font-size: 1.25rem;
    font-family: Lexend, sans-serif;
    margin: 0.5rem;
    line-height: 1.4;

    &:first-child {
      margin-top: 0;
    }
  }

  & a {
    text-decoration: underline;
  }
`;

const Logo = styled.div`
  width: 610px;
  height: 200px;
  background-image: url('/images/ff-light.png');
  background-size: contain;
`;

const TeamPhoto = styled.div`
  width: 450px;
  height: 300px;
  background-image: url('/images/frostfatales23photo.webp');
  background-size: contain;
  border: 4px solid ${SiteConfig.colors.secondary};
`;

const TwoColumn = styled.div`
  display: grid;
  grid-template-columns: max-content 1fr;
  grid-gap: 0.5rem;
`;
