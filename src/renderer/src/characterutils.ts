import type NeuzClient from "$lib/sections/NeuzClient.svelte"

type NeuzSession = {
  id: string
  name: string
  jobId: string
}

type FlyffJob = {
  id: string
  label: string
}

type NeuzLayoutCell = {
  sessionId: string
  running?: boolean
  clientRef?: NeuzClient
}

type NeuzLayoutRow = {
  cells: NeuzLayoutCell[]
}

type NeuzLayout = {
  id: string
  label: string
  rows: NeuzLayoutRow[]
  active?: boolean
}

const FlyffJobsDictionary: Record<string, FlyffJob> = {
  vagrant: { id: 'vagrant', label: 'Vagrant' },
  assist: { id: 'assist', label: 'Assist' },
  ringmaster: { id: 'ringmaster', label: 'Ringmaster' },
  billposter: { id: 'billposter', label: 'Billposter' },
  acrobat: { id: 'acrobat', label: 'Acrobat' },
  ranger: { id: 'ranger', label: 'Ranger' },
  jester: { id: 'jester', label: 'Jester' },
  mercenary: { id: 'mercenary', label: 'Mercenary' },
  blade: { id: 'blade', label: 'Blade' },
  knight: { id: 'knight', label: 'Knight' },
  magician: { id: 'magician', label: 'Magician' },
  psykeeper: { id: 'psykeeper', label: 'Psykeeper' },
  elementor: { id: 'elementor', label: 'Elementor' }
}

const FlyffJobIds = Object.keys(FlyffJobsDictionary)
const FlyffJobs = Object.values(FlyffJobsDictionary)
function getJobName(jobId: string): string {
  const job = FlyffJobsDictionary[jobId]
  if (job) return job.label
  return jobId
}
export { FlyffJobIds, FlyffJobs, FlyffJobsDictionary, getJobName }
export type {
  NeuzSession, FlyffJob,
  NeuzLayoutCell, NeuzLayoutRow, NeuzLayout
}
