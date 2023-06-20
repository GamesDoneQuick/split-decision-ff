import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import type { NextPage, NextPageContext } from 'next';
import { useRouter } from 'next/router';
import { EventAvailability, User } from '@prisma/client';
import Select from 'react-select';
import { EventWithCommitteeMemberIdsAndNames, fetchServerSession, prepareRecordForTransfer } from '../../../../utils/models';
import { EventSubmissionData, fetchEventSubmissionDataForUser, fetchEventWithCommitteeMemberIdsAndNames } from '../../../../utils/dbHelpers';
import { isMemberOfCommittee } from '../../../../utils/eventHelpers';
import { CommitteeToolbar } from '../../../../components/CommitteeToolbar';
import { FormItem, Label } from '../../../../components/layout';
import { prisma } from '../../../../utils/db';
import { UserEventSubmissionView } from '../../../../components/UserEventSubmissionView';

interface RunnerAvailabilityProps {
  event: EventWithCommitteeMemberIdsAndNames;
  usersInEvent: (User & { eventAvailabilities: EventAvailability[] })[];
  selectedUserData: EventSubmissionData | null;
}

const RunnerAvailability: NextPage<RunnerAvailabilityProps> = ({ event, usersInEvent, selectedUserData: userDataFromServer }) => {
  const router = useRouter();
  const [selectedUsername, setSelectedUsername] = useState((router.query.user || '').toString());
  const [selectedUserData, setSelectedUserData] = useState<EventSubmissionData | null>(userDataFromServer);
  const selectedUser = useMemo(() => usersInEvent.find(user => user.name === selectedUsername), [selectedUsername, usersInEvent]);

  const handleSelectUser = useCallback(async (value: User | null) => {
    if (!value) return;
  
    setSelectedUsername(value.name || '');
    router.replace({
      query: { ...router.query, user: value.name },
    });
    
    setSelectedUserData(null);

    const response = await fetch(`/api/user/${value.id}/event/${event.id}`);

    if (response.status === 200) {
      setSelectedUserData(await response.json());
    } else {
      console.error('Failed to load user submission data:');
      console.error(response.body);
    }
  }, [router, event.id]);
  
  return (
    <Container>
      <CommitteeToolbar event={event} isCommitteeMember activePage="editor">
        <UserSelectorContainer>
          <Label htmlFor="userSelect">Runner</Label>
          <Select
            id="userSelect"
            options={usersInEvent}
            value={selectedUser}
            classNamePrefix="selector"
            getOptionValue={item => item.id}
            getOptionLabel={item => item.name ?? '<Name missing>'}
            onChange={handleSelectUser}
          />
        </UserSelectorContainer>
      </CommitteeToolbar>
      <EditorSection>
        {selectedUserData && (
          <UserEventSubmissionView
            user={selectedUserData.user}
            event={event}
            submissions={selectedUserData.submissions}
            incentives={selectedUserData.incentives}
            availability={selectedUserData.availability}
            ignoreLockDate
          />
        )}
      </EditorSection>
    </Container>
  );
};

export default RunnerAvailability;

export async function getServerSideProps(context: NextPageContext) {
  const session = await fetchServerSession(context.req, context.res);

  const event = await fetchEventWithCommitteeMemberIdsAndNames(context.query.id?.toString() || '');

  if (!event || !session || !isMemberOfCommittee(event, session.user)) {
    return {
      notFound: true,
    };
  }

  const uniqueUserSubmissons = await prisma.gameSubmission.findMany({
    where: {
      eventId: event.id,
    },
    distinct: ['userId'],
    include: {
      user: {
        include: {
          vettingInfo: true,
        },
      },
    },
  });

  let selectedUserData = null;
  
  if (context.query.user) {
    const matchingSubmission = uniqueUserSubmissons.find(item => item.user.name === context.query.user);

    if (matchingSubmission) {
      selectedUserData = await fetchEventSubmissionDataForUser(event, matchingSubmission.user);
    }
  }

  return {
    props: {
      event: JSON.parse(JSON.stringify(event)),
      usersInEvent: uniqueUserSubmissons.map(item => ({
        ...prepareRecordForTransfer(item.user),
      })),
      selectedUserData,
    },
  };
}

const Container = styled.div`
  display: flex;
  height: 100%;
  flex-direction: column;
  color: #fff;
  font-weight: 400;
  overflow: hidden;
`;

const UserSelectorContainer = styled(FormItem)`
  position: relative;
  margin-left: 1rem;
  min-width: 0;
  flex-grow: 1;
  align-self: stretch;
  justify-content: center;
  z-index: 3;

  & > div {
    width: 100%;  
  }
`;

const EditorSection = styled.div`
  min-height: 0;
  flex-grow: 1;
  align-self: stretch;
  overflow-y: auto;
`;
