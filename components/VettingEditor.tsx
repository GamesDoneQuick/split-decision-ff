import { VettingInfo } from '@prisma/client';
import { useSession } from 'next-auth/react';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { useSaveable } from '../utils/hooks';
import { useValidatedState, ValidationSchemas } from '../utils/validation';
import { Button, FormItem, Label, TextInput, Alert, HelpText } from './layout';
import { SiteConfig } from '../utils/siteConfig';
import { UserWithVettingInfo } from '../utils/models';

const SAVE_OPTS = {
  requestOptions: {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  },
};

function createEmptyVettingInfo(): VettingInfo {
  return {
    id: '',
    userId: '',
    twitterAccounts: '',
    twitchAccounts: '',
    createdAt: null,
    updatedAt: null,
  };
}

interface EventEditorProps {
  user: UserWithVettingInfo;
}

export const VettingEditor: React.FC<EventEditorProps> = ({ user }) => {
  const session = useSession();
  const router = useRouter();

  const baseVettingInfo = useMemo(() => user.vettingInfo || createEmptyVettingInfo(), [user.vettingInfo]);

  const [validatedVettingInfo, setVettingInfoField] = useValidatedState<VettingInfo>(baseVettingInfo, ValidationSchemas.VettingInfo);

  const handleUpdateTwitterAccounts = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setVettingInfoField('twitterAccounts', event.target.value);
  }, [setVettingInfoField]);

  const handleUpdateTwitchAccounts = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setVettingInfoField('twitchAccounts', event.target.value);
  }, [setVettingInfoField]);

  const [save, isSaving, saveError] = useSaveable<VettingInfo, VettingInfo>('/api/user/vetting', !validatedVettingInfo.error, SAVE_OPTS);
  
  const handleSave = useCallback(async () => {
    const response = await save(validatedVettingInfo.value);

    if (response !== null) {
      router.push('/profile');
    }
  }, [save, validatedVettingInfo.value, router]);

  if (session.status !== 'authenticated') return null;
  return (
    <Container>
      {saveError.error && (
        <Alert variant="error">{saveError.message}</Alert>
      )}
      <FormItem>
        <Label htmlFor="twitterAccounts">Twitter Account(s)</Label>
        <TextInput
          id="twitterAccounts"
          type="text"
          value={validatedVettingInfo.value.twitterAccounts}
          error={validatedVettingInfo.error?.twitterAccounts}
          onChange={handleUpdateTwitterAccounts}
        />
        <HelpText>List all Twitter accounts associated with you, separated by commas. If you have none, write &ldquo;none&rdquo;.</HelpText>
      </FormItem>
      <FormItem>
        <Label htmlFor="twitchAccounts">Twitch Account(s)</Label>
        <TextInput
          id="twitchAccounts"
          type="text"
          value={validatedVettingInfo.value.twitchAccounts}
          error={validatedVettingInfo.error?.twitchAccounts}
          onChange={handleUpdateTwitchAccounts}
        />
        <HelpText>List all Twitch accounts associated with you, separated by commas. If you have none, write &ldquo;none&rdquo;.</HelpText>
      </FormItem>
      
      <FormItemWithDivider>
        <Button onClick={handleSave} disabled={isSaving || !!validatedVettingInfo.error}>Save</Button>
      </FormItemWithDivider>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;

const FormItemWithDivider = styled(FormItem)`
  border-top: 1px solid ${SiteConfig.colors.accents.separator};
  padding-top: 1rem;
`;
