<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte'
  import { ChevronsUpDown, HardDrive, Plus, Save, Trash } from 'lucide-svelte'
  import { Input } from '$lib/components/ui/input'
  import * as Command from '$lib/components/ui/command'
  import * as Popover from '$lib/components/ui/popover'
  import { onMount, tick } from 'svelte'
  import { FlyffJobs, getJobName, type NeuzSession } from '../../../characterutils'
  import Separator from '$lib/components/ui/separator/separator.svelte'
  import * as Table from '$lib/components/ui/table'
  import * as Select from "$lib/components/ui/select";

  let sessions: NeuzSession[] = []
  let deletingSessions : string[] = []

  function saveSessions() {
    deletingSessions.forEach(sid => {
        clearCache(sid)
    });
    localStorage.setItem('sessions', JSON.stringify(sessions))
  }

  function clearCache(sid: string) {
    window.electron.ipcRenderer.send('clearCache', sid)
  }

  function deleteSession(sid: string) {
    deletingSessions.push(sid)
    sessions = sessions.filter((s) => {
      return s.id != sid
    })
  }

  let open = false
  let jobValue = 'vagrant'
  let newName: string = ''

  $: selectedJobValue = FlyffJobs.find((f) => f.id === jobValue)?.label ?? 'Select a job...'

  function closeAndFocusTrigger(triggerId: string) {
    open = false
    tick().then(() => {
      document.getElementById(triggerId)?.focus()
    })
  }

  onMount(() => {
    sessions = JSON.parse(localStorage.getItem('sessions') || '[]')
  })
</script>

<section class="py-4">
  <div class="flex items-center gap-2 w-auto px-2">
    <Popover.Root bind:open let:ids>
      <Popover.Trigger asChild let:builder>
        <Button
          builders={[builder]}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          class="w-[200px] justify-between"
        >
          <!-- svelte-ignore a11y-missing-attribute -->
          <img src="jobs/{selectedJobValue.toLowerCase()}.png" />
          {selectedJobValue}
          <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </Popover.Trigger>
      <Popover.Content class="w-[200px] p-0">
        <Command.Root>
          <Command.Input placeholder="Search job..." />
          <Command.Empty>No job found.</Command.Empty>
          <Command.Group>
            {#each FlyffJobs as job}
              <Command.Item
                class={jobValue == job.id ? 'dark:bg-white/20 bg-black/20' : ''}
                value={job.id}
                onSelect={(currentValue) => {
                  jobValue = currentValue
                  closeAndFocusTrigger(ids.trigger)
                }}
              >
                <!-- svelte-ignore a11y-missing-attribute -->
                <img src="jobs/{job.id}.png" />
                <span class="pl-2">{job.label}</span>
              </Command.Item>
            {/each}
          </Command.Group>
        </Command.Root>
      </Popover.Content>
    </Popover.Root>
    <Input class="w-auto" bind:value={newName} placeholder="Character Name" />
    <Button
      on:click={() => {
        if (jobValue == '' || newName == '') {
          alert('Please select a job and a name for your session')
          return
        }
        sessions.push({
          id: '' + Date.now(),
          name: newName,
          jobId: jobValue
        })
        sessions = sessions

        jobValue = 'vagrant'
        newName = ''
      }}
    >
      <Plus class="h-5" />
      <span>Add Session</span>
    </Button>
    <div class="flex-1"></div>
    <Button on:click={saveSessions} class="flex gap-2 items-center">
        Save Changes
        <Save class="h-5" />
    </Button>
  </div>
  <Separator class="my-2" />

  <Table.Root>
    <Table.Caption>A list of your flyff universe sessions.</Table.Caption>
    <Table.Header>
      <Table.Row>
        <Table.Head class="w-[100px]">Job</Table.Head>
        <Table.Head class="w-full">Name</Table.Head>
        <Table.Head>Session ID</Table.Head>
        <Table.Head>Actions</Table.Head>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {#each sessions as session}
        <Table.Row>
          <Table.Cell>
            <div  class="flex gap-2 items-center">
              <!-- svelte-ignore a11y-missing-attribute -->
              <img src="jobs/{session.jobId}.png" />

              <Select.Root selected={{value: session.jobId , label: getJobName(session.jobId)}}  onSelectedChange={(v) => {
                session.jobId = v.value;
              }}>
                <Select.Trigger class="w-[180px]">
                  <Select.Value placeholder="Job" />
                </Select.Trigger>
                <Select.Content>
                    {#each FlyffJobs as job}
                  <Select.Item value="{job.id}" class="flex gap-2">
                    <!-- svelte-ignore a11y-missing-attribute -->
                    <img src="jobs/{job.id}.png" />
                    {job.label}</Select.Item>
                {/each}

                </Select.Content>
              </Select.Root>
            </div>
            </Table.Cell
          >
          <Table.Cell class="w-full">{session.name}</Table.Cell>
          <Table.Cell>{session.id}</Table.Cell>
          <Table.Cell>
            <div  class="flex gap-2 items-center">
            <Button
              class="gap-2"
              size="sm"
              on:click={() => {
                clearCache(session.id)
              }}
            >
              <HardDrive class="h-5" />
              Clear Data
            </Button>
            <Button
              class="gap-2"
              size="sm"
              on:click={() => {
                deleteSession(session.id)
              }}
            >
              <Trash class="h-5" />
            </Button>
            </div>
          </Table.Cell>
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
</section>
