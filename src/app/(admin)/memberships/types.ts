export interface Member {
  id: string;
  name: string;
}

export interface Membership {
  id: string;
  memberId: string;
  startDate: string;     // Exibição (DD/MM/YYYY)
  endDate: string;       // Exibição (DD/MM/YYYY)
  rawStartDate: string;  // ISO para input date
  rawEndDate: string;    // ISO para input date
  planName: string;
  price: number;
}

// Extensão para uso no modal (precisa do nome do aluno para exibir no título)
export interface MembershipToEdit extends Membership {
  memberName: string;
}