import React from 'react';
import { ErrorDisplay } from '../components/ErrorDisplay';

const ERROR_DESCRIPTIONS = [
  'It\'s like Fleet Fatales 2021.',
  'Pretty sure that loses time.',
  'Going out-of-bounds like this isn\'t marathon safe.',
  'I thought this run was supposed to be NMG?',
];

export default function Error404() {
  return (
    <ErrorDisplay
      title="This page does not exist."
      descriptions={ERROR_DESCRIPTIONS}
    />
  );
}
