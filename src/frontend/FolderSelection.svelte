<StepHeader {step}/>
<p>
  {$_("steps." + step + ".introduction")}
</p>
<List singleSelection>
  <Separator/>
  <Subheader>
    <span class="breadcrumb" on:click={rootNavigation}>
      {$_("drive.driveList")}
    </span>
    {#each path as segment (segment.id)}
      &nbsp; &gt; &nbsp;
      <span class="breadcrumb" on:click={() => breadcrumbNavigation(segment)}>
        {segment.name}
      </span>
    {/each}
  </Subheader>
  <Separator/>
  {#if items === null}
    <LinearProgress indeterminate/>
  {:else}
    {#each items as item (item.id)}
      <Item on:dblclick={() => itemNavigation(item)} on:SMUI:action={() => selected = item} selected={selected !== null && selected.id === item.id}>
        <Text>
          {item.name}
        </Text>
      </Item>
    {/each}
  {/if}
  <Separator/>
</List>

<script lang="ts">
  import {createEventDispatcher} from "svelte";
  import {_} from "svelte-i18n";
  import LinearProgress from "@smui/linear-progress/styled";
  import List, {Item, Separator, Subheader, Text} from "@smui/list/styled";

  import StepHeader from "./StepHeader.svelte";

  import type { ListResponse } from "../interfaces/ListResponse";
  import type { NamedRecord } from "../interfaces/NamedRecord";

  export let step: string;
  export let path: Array<NamedRecord> = [];
  export let selected: NamedRecord|null = null;

  const dispatch = createEventDispatcher();

  let items: Array<NamedRecord>|null = null;

  function rootNavigation(): void {
    selected = null;
    path = [];
    getItems();
  }

  function breadcrumbNavigation(segment: NamedRecord): void {
    selected = null;
    path = path.slice(0, path.findIndex((item) => item.id === segment.id) + 1);
    getItems();
  }

  function itemNavigation(item: NamedRecord): void {
    selected = null;
    path = [...path, item];
    getItems();
  }

  function handleListError(type: string) {
    switch (type) {
      case "DriveAPIError":
        dispatch("error", {
          message: $_("errorDialog.DriveAPIError"),
        })
        break;
      default:
        dispatch("error", {
          message: $_("errorDialog.unknownError"),
        })
        break;
    }
  }

  function handleSharedDriveResponse(response: ListResponse): void {
    if (response.status === "error") {
      handleListError(response.type);
      return;
    }
    items = [{id: "root", name: $_("drive.myDrive")}, ...response.response];
  }

  function handleFolderResponse(response: ListResponse): void {
    if (response.status === "error") {
      handleListError(response.type);
      return;
    }
    items = response.response;
  }

  function handleError(response: Error): void {
    dispatch("error", {
      message: $_("errorDialog.unknownErrorWithMessage") + response.message,
    })
  }

  function getItems(): void {
    items = null;
    if(path.length === 0) {
      google.script.run
        .withSuccessHandler(handleSharedDriveResponse)
        .withFailureHandler(handleError)
        .listSharedDrives();
    } else {
      google.script.run
        .withSuccessHandler(handleFolderResponse)
        .withFailureHandler(handleError)
        .listFolders(path[path.length - 1].id);
    }
  }

  getItems();
</script>

<style lang="scss">
  @use "smui-theme" as theme;

  .breadcrumb {
    cursor: pointer;
    color: theme.$primary;
  }
</style>
