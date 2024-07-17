import React from 'react';

const MembersList = ({ members, memberships }) => {
  return (
    <ul className="divide-y divide-gray-200">
      {members.map(member => (
        <li key={member.id} className="py-4 flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-gray-900">{member.name}</p>

            <span className="flex space-x-2">
              {memberships.filter(membership => membership.memberId === member.id).map(membership => (
                <p key={membership.id} className="text-xs text-gray-500">{membership.startDate}</p>
              ))}
            </span>

          </div>
        </li>
      ))}
    </ul>
  );
}

export default MembersList;