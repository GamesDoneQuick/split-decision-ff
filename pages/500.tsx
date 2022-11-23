import React from 'react';
import { ErrorDisplay } from '../components/ErrorDisplay';

const ERROR_DESCRIPTIONS = [
  'We\'ll get to work on tiger-proofing our cables.',
  '...that\'s never happened before? Are we still doing that?',
  'This one\'s our fault, but if you wanna take the blame for it, that\'s cool too.',
  'Can we cut to break-',
  'They told us to have Faith in our servers, and now look what she\'s done!',
];

export default function Error500() {
  return (
    <ErrorDisplay
      title="An unexpected error occurred."
      descriptions={ERROR_DESCRIPTIONS}
    />
  );
}
