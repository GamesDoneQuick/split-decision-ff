import { GameSubmissionCategory } from '@prisma/client';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { IncentiveWithCategories, SubmissionWithCategories } from '../utils/models';
import { SiteConfig } from '../utils/siteConfig';

interface SubmissionIncentivesProps {
  submission: SubmissionWithCategories;
  allIncentives: IncentiveWithCategories[];
}

const SubmissionIncentives: React.FC<SubmissionIncentivesProps> = ({ submission, allIncentives }) => {
  const relevantIncentives = useMemo(() => {
    const categoryMapping = submission.categories.reduce((acc, item) => ({
      ...acc,
      [item.id]: item,
    }), {} as Record<string, GameSubmissionCategory>);

    const forSubmission = allIncentives.filter(item => item.gameSubmissionId === submission.id);

    return forSubmission.map(incentive => ({
      ...incentive,
      categories: incentive.attachedCategories.map(item => categoryMapping[item.categoryId]),
    }));
  }, [allIncentives, submission]);

  return (
    <SubmissionDetailsContainer>
      <GameTitle>{submission.gameTitle}</GameTitle>
      {relevantIncentives.length > 0 && (
        <CategoryTable>
          <thead>
            <tr>
              <th>Incentive</th>
              <th>Estimate</th>
              <th>Categories</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {relevantIncentives.map(incentive => (
              <tr key={incentive.id}>
                <td width="15%">
                  <a href={incentive.videoURL} target="_blank" rel="noopener noreferrer">
                    {incentive.name}
                  </a>
                </td>
                <NumericCell width="10%">{incentive.estimate}</NumericCell>
                <td width="25%">{incentive.categories.map(item => item.categoryName).join(', ')}</td>
                <DescriptionCell>{incentive.description}</DescriptionCell>
              </tr>
            ))}
          </tbody>
        </CategoryTable>
      )}
    </SubmissionDetailsContainer>
  );
};

interface SubmissionIncentivesListProps {
  submissions: SubmissionWithCategories[];
  allIncentives: IncentiveWithCategories[];
}

export const SubmissionIncentivesList: React.FC<SubmissionIncentivesListProps> = ({ submissions, allIncentives }) => (
  <Container>
    {submissions.map(submission => (
      <SubmissionIncentives
        key={submission.id}
        submission={submission}
        allIncentives={allIncentives}
      />
    ))}
  </Container>
);

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;

const CategoryTable = styled.table`
  border-collapse: collapse;
  margin-top: 0.5rem;
  
  & th,
  & td {
    padding: 0.25rem 0.5rem;
    vertical-align: top;
  }
  
  & th {
    text-align: left;
    background-color: rgba(0, 0, 0, 0.5);
    color: #fff;
  }

  & tr:nth-of-type(2n) td {
    background-color: rgba(0, 0, 0, 0.25);
  }
`;

const SubmissionDetailsContainer = styled.div`
  display: flex;
  flex-direction: column;

  & + & {
    border-top: 1px solid ${SiteConfig.colors.secondary};
    padding-top: 0.5rem;
    margin-top: 0.5rem;
  }
`;

const GameTitle = styled.h3`
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
`;

const NumericCell = styled.td`
  font-variant-numeric: tabular-nums;
`;

const DescriptionCell = styled.td`
  word-break: break-word;  
`;
