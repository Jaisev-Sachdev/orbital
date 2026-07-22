export interface TreeNode {
  type: 'MODULE' | 'AND' | 'OR' | 'N_OF' | 'PROGRAMME' | 'OTHER'
  code?: string
  title?: string
  text?: string
  n?: number
  children?: TreeNode[]
  prerequisiteTree?: TreeNode | null
}

export interface TreeResponse {
  moduleCode?: string
  prerequisiteTree?: TreeNode | null
  prerequisiteText?: string
  type?: 'MODULE' | 'AND' | 'OR' | 'N_OF' | 'PROGRAMME' | 'OTHER'
  children?: TreeNode[]
}