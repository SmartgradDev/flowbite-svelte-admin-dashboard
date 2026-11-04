<script lang="ts">
	// Venues for the public /all-workshops page: STEAM Academy hubs and school campuses.
	import { onMount } from 'svelte';
	import {
		Alert, Badge, Breadcrumb, BreadcrumbItem, Button, Heading, Input, Label, Modal, Select, Spinner, Toggle,
		Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell
	} from 'flowbite-svelte';
	import { api, errMsg } from '$lib/adminApi';
	import MetaTag from '../../../utils/MetaTag.svelte';

	type Venue = {
		id?: string; kind: string; name: string; shortName: string; area: string; address: string | null;
		lat: number | null; lng: number | null; isActive: boolean; _count?: { listings: number };
	};

	let venues: Venue[] = [];
	let loading = true;
	let error = '';
	let open = false;
	let saving = false;
	let formError = '';
	let form: Venue = blank();
	let mapsLink = '';

	function blank(): Venue {
		return { kind: 'hub', name: '', shortName: '', area: '', address: '', lat: null, lng: null, isActive: true };
	}

	async function load() {
		loading = true;
		try {
			venues = (await api.get('/admin/workshopVenues')).data.result;
			error = '';
		} catch (e) {
			error = errMsg(e);
		}
		loading = false;
	}
	onMount(load);

	function edit(v?: Venue) {
		form = v ? { ...v } : blank();
		mapsLink = '';
		pinMsg = '';
		formError = '';
		open = true;
	}

	// Pull lat/lng out of a Google Maps link ("@23.79,90.40", "q=23.79,90.40", "!3d23.79!4d90.40").
	// Runs on input/change/blur (not a reactive block, which also re-ran on every form edit
	// and overwrote manually typed coordinates).
	let pinMsg = '';
	function readPin() {
		const link = mapsLink.trim();
		if (!link) return (pinMsg = '');
		// Exact place pin (!3d..!4d..) first, then the map centre / query coordinates.
		const m = link.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || link.match(/(?:@|q=|ll=|query=)(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/);
		if (m) {
			form = { ...form, lat: Number(m[1]), lng: Number(m[2]) };
			pinMsg = `✓ Pin found: ${m[1]}, ${m[2]}`;
		} else {
			pinMsg = 'No coordinates in this link. Open the place in Google Maps on a computer, copy the full URL from the address bar (it contains @lat,lng), or type Latitude/Longitude below.';
		}
	}

	// Admin standing at the venue: take the device's location as the pin.
	let locating = false;
	function useMyLocation() {
		if (!navigator.geolocation) return (pinMsg = 'This browser cannot share location.');
		locating = true;
		navigator.geolocation.getCurrentPosition(
			(p) => {
				form = { ...form, lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) };
				const acc = Math.round(p.coords.accuracy);
				pinMsg = acc > 100
					? `Location set, but only accurate to about ${acc} m (laptops guess from Wi-Fi). A phone or a Google Maps link is more precise.`
					: `✓ Pin set from your location (accurate to about ${acc} m)`;
				locating = false;
			},
			() => {
				pinMsg = 'Could not get your location. Allow location access, or paste a Google Maps link.';
				locating = false;
			},
			{ enableHighAccuracy: true, timeout: 15000 }
		);
	}

	async function save() {
		saving = true;
		formError = '';
		try {
			const body = { ...form, lat: form.lat === null || (form.lat as any) === '' ? null : Number(form.lat), lng: form.lng === null || (form.lng as any) === '' ? null : Number(form.lng) };
			if (form.id) await api.patch(`/admin/workshopVenues/${form.id}`, body);
			else await api.post('/admin/workshopVenues', body);
			open = false;
			await load();
		} catch (e) {
			formError = errMsg(e);
		}
		saving = false;
	}

	// In-page delete dialog (native confirm() gets auto-dismissed in some browsers).
	let delVenue: Venue | null = null;
	let delOpen = false;
	let delError = '';
	let delBusy = false;
	function askDelete(v: Venue) {
		delVenue = v;
		delError = '';
		delOpen = true;
	}
	async function confirmDelete() {
		if (!delVenue) return;
		delBusy = true;
		delError = '';
		try {
			await api.delete(`/admin/workshopVenues/${delVenue.id}`);
			delOpen = false;
			await load();
		} catch (e) {
			delError = errMsg(e);
		}
		delBusy = false;
	}
	async function deactivate() {
		if (!delVenue) return;
		delBusy = true;
		try {
			await api.patch(`/admin/workshopVenues/${delVenue.id}`, { isActive: false });
			delOpen = false;
			await load();
		} catch (e) {
			delError = errMsg(e);
		}
		delBusy = false;
	}
</script>

<MetaTag path="/crud/workshop-venues" title="Workshop Venues" subtitle="Workshop Venues" description="Hubs and school campuses for the all-workshops page" />

<main class="relative h-full w-full overflow-y-auto bg-white p-4 dark:bg-gray-800">
	<Breadcrumb class="mb-4">
		<BreadcrumbItem home href="/dashboard">Home</BreadcrumbItem>
		<BreadcrumbItem>All Workshops</BreadcrumbItem>
		<BreadcrumbItem>Venues</BreadcrumbItem>
	</Breadcrumb>
	<div class="mb-4 flex items-center justify-between gap-4">
		<div>
			<Heading tag="h1" class="text-xl font-semibold sm:text-2xl">Venues</Heading>
			<p class="text-sm text-gray-500">
				<b>Hub</b> = Octobrain STEAM Academy centre, open to any student. <b>School</b> = a school campus, only its own students.
			</p>
		</div>
		<Button on:click={() => edit()}>+ Add venue</Button>
	</div>

	{#if error}<Alert color="red" class="mb-4">{error}</Alert>{/if}

	{#if loading}
		<Spinner />
	{:else}
		<Table hoverable>
			<TableHead>
				<TableHeadCell>Type</TableHeadCell>
				<TableHeadCell>Name</TableHeadCell>
				<TableHeadCell>Card label</TableHeadCell>
				<TableHeadCell>Area</TableHeadCell>
				<TableHeadCell>Map pin</TableHeadCell>
				<TableHeadCell>Pages</TableHeadCell>
				<TableHeadCell>Status</TableHeadCell>
				<TableHeadCell />
			</TableHead>
			<TableBody>
				{#each venues as v (v.id)}
					<TableBodyRow>
						<TableBodyCell><Badge color={v.kind === 'hub' ? 'purple' : 'dark'}>{v.kind === 'hub' ? 'Hub' : 'School'}</Badge></TableBodyCell>
						<TableBodyCell class="whitespace-normal">{v.name}<div class="text-xs text-gray-500">{v.address ?? ''}</div></TableBodyCell>
						<TableBodyCell>{v.shortName}</TableBodyCell>
						<TableBodyCell>{v.area}</TableBodyCell>
						<TableBodyCell>{v.lat != null ? `${v.lat}, ${v.lng}` : '—'}</TableBodyCell>
						<TableBodyCell>{v._count?.listings ?? 0}</TableBodyCell>
						<TableBodyCell><Badge color={v.isActive ? 'green' : 'red'}>{v.isActive ? 'Active' : 'Inactive'}</Badge></TableBodyCell>
						<TableBodyCell class="space-x-2">
							<Button size="xs" on:click={() => edit(v)}>Edit</Button>
							<Button size="xs" color="red" on:click={() => askDelete(v)}>Delete</Button>
						</TableBodyCell>
					</TableBodyRow>
				{:else}
					<TableBodyRow><TableBodyCell colspan="8">No venues yet. Add your hubs first.</TableBodyCell></TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	{/if}
</main>

<Modal bind:open title={form.id ? 'Edit venue' : 'Add venue'} size="md" autoclose={false}>
	<form class="grid grid-cols-2 gap-4" on:submit|preventDefault={save}>
		<Label class="col-span-2 space-y-1">
			<span>Type</span>
			<Select bind:value={form.kind} items={[{ value: 'hub', name: 'Hub (Octobrain STEAM Academy, any student)' }, { value: 'school', name: 'School campus (only its students)' }]} />
		</Label>
		<Label class="col-span-2 space-y-1"><span>Full name</span><Input bind:value={form.name} required placeholder="Octobrain STEAM Academy, Codesk" /></Label>
		<Label class="space-y-1"><span>Card label (short)</span><Input bind:value={form.shortName} required placeholder="Codesk Banani" /></Label>
		<Label class="space-y-1"><span>Area</span><Input bind:value={form.area} required placeholder="Banani" /></Label>
		<Label class="col-span-2 space-y-1"><span>Address</span><Input bind:value={form.address} placeholder="House, Road, Area, Dhaka" /></Label>
		<Label class="col-span-2 space-y-1">
			<span>Google Maps link (optional, fills lat/lng)</span>
			<Input bind:value={mapsLink} on:input={readPin} on:change={readPin} on:blur={readPin} placeholder="https://www.google.com/maps/place/...@23.79,90.40,17z" />
			<Button size="xs" color="light" class="mt-1" disabled={locating} on:click={useMyLocation}>
				{locating ? 'Getting location…' : '📍 Use my current location (if you are at this venue)'}
			</Button>
			{#if pinMsg}<span class="text-xs {pinMsg.startsWith('✓') ? 'text-green-600' : 'text-orange-600'}">{pinMsg}</span>{/if}
		</Label>
		<Label class="space-y-1"><span>Latitude</span><Input type="number" step="any" bind:value={form.lat} /></Label>
		<Label class="space-y-1"><span>Longitude</span><Input type="number" step="any" bind:value={form.lng} /></Label>
		<div class="col-span-2"><Toggle bind:checked={form.isActive}>Active (shown on the website)</Toggle></div>
		{#if formError}<Alert color="red" class="col-span-2">{formError}</Alert>{/if}
		<div class="col-span-2 flex justify-end gap-2">
			<Button color="alternative" on:click={() => (open = false)}>Cancel</Button>
			<Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save venue'}</Button>
		</div>
	</form>
</Modal>

<Modal bind:open={delOpen} title="Delete venue" size="sm" autoclose={false}>
	{#if delVenue}
		{#if (delVenue._count?.listings ?? 0) > 0}
			<Alert color="yellow">
				<b>{delVenue.name}</b> is used by {delVenue._count?.listings} workshop page(s), so it can't be deleted.
				Delete or move those pages first, or <b>deactivate</b> the venue to hide it from the website.
			</Alert>
		{:else}
			<p>Delete <b>{delVenue.name}</b>? This cannot be undone.</p>
		{/if}
		{#if delError}<Alert color="red" class="mt-3">{delError}</Alert>{/if}
		<div class="mt-4 flex justify-end gap-2">
			<Button color="alternative" on:click={() => (delOpen = false)}>Cancel</Button>
			{#if (delVenue._count?.listings ?? 0) > 0}
				{#if delVenue.isActive}<Button color="yellow" disabled={delBusy} on:click={deactivate}>Deactivate instead</Button>{/if}
			{:else}
				<Button color="red" disabled={delBusy} on:click={confirmDelete}>{delBusy ? 'Deleting…' : 'Delete'}</Button>
			{/if}
		</div>
	{/if}
</Modal>
