import merge from 'deepmerge';
import config from '../config.json';

interface SiteConfiguration {
  heroImage: string;
  embedImage: string;
  favicon: string;
  siteName: string;
  siteDescription: string;
  organizationName: string;
  colors: {
    primary: string;
    accents: {
      control: string;
      eventItem: string;
      separator: string;
      alert: string;
      link: string;
      linkDark: string;
      activeTimeslot: string;
      hover: {
        control: string;
      }
    },
    text: {
      primary: string;
      light: string;
      dark: string;
      darkLabel: string;
    },
    error: {
      background: string;
      text: string;
      dark: {
        background: string;
      };
    },
    warning: {
      background: string;
      text: string;
    }
  }
}

const DEFAULT_CONFIG: SiteConfiguration = {
  heroImage: '',
  embedImage: '',
  favicon: '',
  siteName: 'My Submission Site',
  organizationName: 'My Organization',
  siteDescription: 'The cool and also rad submission site!',
  colors: {
    primary: '#4C3973',
    accents: {
      control: '#BF7AA0',
      eventItem: '#F2EB85',
      separator: '#F2BB77',
      alert: '#D4DFF2',
      link: '#ACCBFF',
      linkDark: '#3E5A8A',
      activeTimeslot: '#02DBB4',
      hover: {
        control: '#a7487c',
      },
    },
    text: {
      primary: '#B5B5B5',
      light: '#E0E0E0',
      dark: '#000',
      darkLabel: '#555',
    },
    error: {
      background: '#FEECEC',
      text: '#B13855',
      dark: {
        background: '#C4244A',
      },
    },
    warning: {
      background: '#F2BB77',
      text: '#6B3F08',
    },
  },
} as const;

export const SiteConfig: SiteConfiguration = merge(DEFAULT_CONFIG, (config || {}) as SiteConfiguration);
