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
    secondary: string;
    accents: {
      header: string;
      control: string;
      eventItem: string;
      alert: string;
      link: string;
      linkDark: string;
      activeTimeslot: string;
      hover: {
        control: string;
        link: string;
      }
    },
    input: {
      background: string;
      border: string;
      text: string;
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
    },
    status: {
      accepted: string;
      declined: string;
      backup: string;
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
    // primary: '#4C3973',
    primary: '#271E3B', // '#221A34',
    secondary: '#120c1f',
    accents: {
      header: '#4C3973',
      control: '#615D87',
      eventItem: '#DAD478',
      alert: '#ADA7DE',
      link: '#ACCBFF',
      linkDark: '#3E5A8A',
      activeTimeslot: '#28915B',
      hover: {
        control: '#4C496A',
        link: '#D1E2FF',
      },
    },
    input: {
      background: '#312F45',
      border: '#5E5B79',
      text: '#EDEDF0',
    },
    text: {
      primary: '#E9E9EB',
      light: '#fff',
      dark: '#000',
      darkLabel: '#555',
    },
    error: {
      background: '#592525',
      text: '#ED9DB0',
      dark: {
        background: '#C4244A',
      },
    },
    warning: {
      background: '#F2BB77',
      text: '#6B3F08',
    },
    status: {
      accepted: '#537334',
      declined: '#751114',
      backup: '#69651F',
    },
  },
} as const;

export const SiteConfig: SiteConfiguration = merge(DEFAULT_CONFIG, (config || {}) as SiteConfiguration);
