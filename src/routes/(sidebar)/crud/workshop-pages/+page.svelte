<script lang="ts">
	// Workshop landing pages shown on the public /all-workshops page.
	// Admin creates pages directly, or reviews pages submitted by club owners.
	import { onMount } from 'svelte';
	import {
		Alert, Badge, Breadcrumb, BreadcrumbItem, Button, ButtonGroup, Checkbox, Heading, Input, Label, Modal, Select,
		Spinner, Textarea, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell
	} from 'flowbite-svelte';
	import { api, errMsg, uploadImage } from '$lib/adminApi';
	import MetaTag from '../../../utils/MetaTag.svelte';

	const SITE = 'https://octobrain.org';
	const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
	const FILTERS = [
		{ id: '', label: 'All' },
		{ id: 'needs_review', label: 'Needs review' },
		{ id: 'approved', label: 'Live' },
		{ id: 'draft', label: 'Draft' },
		{ id: 'rejected', label: 'Rejected' }
	];
	const APPROVAL_COLOR: Record<string, any> = { approved: 'green', pending: 'yellow', draft: 'dark', rejected: 'red' };
	const APPROVAL_LABEL: Record<string, string> = { approved: 'Live', pending: 'Waiting for approval', draft: 'Draft', rejected: 'Rejected' };

	let listings: any[] = [];
	let venues: any[] = [];
	let filter = '';
	let q = '';
	let loading = true;
	let error = '';

	// editor
	let open = false;
	let saving = false;
	let uploading = false;
	let formError = '';
	let f: any = blank();

	// registrations
	let regOpen = false;
	let regFor: any = null;
	let regs: any[] = [];
	let regLoading = false;

	function blank() {
		return {
			id: null, title: '', slug: '', venueId: '', tagline: '', description: '',
			gradeMin: 1, gradeMax: 10, days: [] as string[], time: '', hoursPerSession: 2,
			startDate: '', deadline: '', fee: 0, seats: 20, status: 'open',
			coverUrl: '', gallery: [] as string[],
			sessions: [{ title: '', outcomes: '' }], highlights: '', faqs: [] as { q: string; a: string }[],
			contact: { name: '', role: '', phone: '' }, classCount: '', feeNote: '', mode: 'offline', subject: 'Robotics',
			paymentMode: 'online', bkashNumber: '', bkashMethod: 'Payment', referencePrefix: '', paymentNote: '',
			approvalStatus: 'approved', source: 'admin', pendingChanges: null, rejectionReason: null
		};
	}

	const without = (arr: any[], i: number) => arr.filter((_: any, j: number) => j !== i);
	const day = (d: string | null) => (d ? String(d).slice(0, 10) : '');
	const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

	// API row -> form
	function toForm(l: any) {
		const c = l.content || {};
		return {
			...blank(), ...l,
			tagline: l.tagline ?? '', description: l.description ?? '', time: l.time ?? '', coverUrl: l.coverUrl ?? '',
			bkashNumber: l.bkashNumber ?? '', bkashMethod: l.bkashMethod ?? 'Payment', referencePrefix: l.referencePrefix ?? '', paymentNote: l.paymentNote ?? '',
			startDate: day(l.startDate), deadline: day(l.deadline),
			sessions: (c.sessions?.length ? c.sessions : [{ title: '', outcomes: [] }]).map((s: any) => ({ title: s.title, outcomes: (s.outcomes || []).join('\n') })),
			highlights: (c.highlights || []).join('\n'),
			faqs: c.faqs || [],
			contact: { name: '', role: '', phone: '', ...(c.contact || {}) },
			classCount: c.classCount ?? '', feeNote: c.feeNote ?? '', mode: c.mode || 'offline', subject: c.subject || 'Robotics'
		};
	}

	// form -> API body
	function toBody(x: any) {
		const contact = x.contact.name || x.contact.phone ? x.contact : undefined;
		return {
			title: x.title, slug: x.slug || undefined, venueId: x.venueId, tagline: x.tagline, description: x.description,
			gradeMin: x.gradeMin, gradeMax: x.gradeMax, days: x.days, time: x.time, hoursPerSession: x.hoursPerSession,
			startDate: x.startDate, deadline: x.deadline || null, fee: x.fee, seats: x.seats, status: x.status,
			coverUrl: x.coverUrl, gallery: x.gallery,
			content: {
				sessions: x.sessions.filter((s: any) => s.title.trim()).map((s: any) => ({ title: s.title.trim(), outcomes: lines(s.outcomes) })),
				highlights: lines(x.highlights),
				faqs: x.faqs.filter((a: any) => a.q.trim() && a.a.trim()),
				...(contact && { contact }),
				...(x.classCount !== '' && { classCount: Number(x.classCount) }),
				...(x.feeNote && { feeNote: x.feeNote }),
				mode: x.mode, subject: x.subject
			},
			paymentMode: x.paymentMode, bkashNumber: x.bkashNumber, bkashMethod: x.bkashMethod,
			referencePrefix: x.referencePrefix, paymentNote: x.paymentNote,
			approvalStatus: x.id ? undefined : x.approvalStatus
		};
	}

	async function load() {
		loading = true;
		try {
			const [l, v] = await Promise.all([
				api.get('/admin/workshopListings', { params: { approval: filter || undefined, q: q || undefined } }),
				api.get('/admin/workshopVenues')
			]);
			listings = l.data.result;
			venues = v.data.result;
			error = '';
		} catch (e) {
			error = errMsg(e);
		}
		loading = false;
	}
	onMount(load);

	function edit(l?: any) {
		f = l ? toForm(l) : blank();
		formError = '';
		open = true;
	}

	async function save(approveAfter = false) {
		saving = true;
		formError = '';
		try {
			let saved;
			if (f.id) saved = (await api.patch(`/admin/workshopListings/${f.id}`, toBody(f))).data.result;
			else saved = (await api.post('/admin/workshopListings', toBody(f))).data.result;
			if (approveAfter) await api.post(`/admin/workshopListings/${saved.id}/approve`, {});
			open = false;
			await load();
		} catch (e) {
			formError = errMsg(e);
		}
		saving = false;
	}

	// In-page action dialog (native confirm()/prompt() get auto-dismissed in some browsers).
	type Action = 'approve' | 'reject' | 'delete';
	let actOpen = false;
	let actType: Action = 'approve';
	let actItem: any = null;
	let actReason = '';
	let actError = '';
	let actBusy = false;

	function act(l: any, action: Action) {
		actItem = l;
		actType = action;
		actReason = '';
		actError = '';
		actOpen = true;
	}

	async function runAction() {
		const l = actItem;
		if (actType === 'reject' && !actReason.trim()) {
			actError = 'Please write a reason. The club owner will see it.';
			return;
		}
		actBusy = true;
		actError = '';
		try {
			if (actType === 'approve') await api.post(`/admin/workshopListings/${l.id}/approve`, {});
			if (actType === 'reject') await api.post(`/admin/workshopListings/${l.id}/reject`, { reason: actReason.trim() });
			if (actType === 'delete') await api.delete(`/admin/workshopListings/${l.id}`);
			actOpen = false;
			await load();
		} catch (e) {
			actError = errMsg(e);
		}
		actBusy = false;
	}

	async function onUpload(e: Event, target: 'cover' | 'gallery') {
		const files = Array.from((e.target as HTMLInputElement).files || []);
		if (!files.length) return;
		uploading = true;
		try {
			const urls = await Promise.all(files.map(uploadImage));
			if (target === 'cover') f.coverUrl = urls[0];
			else f.gallery = [...f.gallery, ...urls];
		} catch (err) {
			formError = errMsg(err, 'Upload failed');
		}
		uploading = false;
	}

	async function showRegs(l: any) {
		regFor = l;
		regOpen = true;
		regLoading = true;
		try {
			const r = await api.get('/admin/allcustomPaymentData', { params: { search_value: l.slug, search_by: 'what_are_you_purchasing' } });
			regs = (r.data.result || []).filter((p: any) => p.listingId === l.id || p.what_are_you_purchasing === l.slug);
		} catch (e) {
			regs = [];
			error = errMsg(e);
		}
		regLoading = false;
	}

	const EXPERIENCE: Record<string, string> = {
		none: 'First time',
		octobrain: 'Octobrain workshop before',
		block_coding: 'Some block coding',
		advanced: 'Robotics kits / text coding'
	};
	const fmt = (d: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
	const change = (l: any, k: string) => `${k}: ${JSON.stringify(l[k])} → ${JSON.stringify(l.pendingChanges[k])}`;
</script>

<MetaTag path="/crud/workshop-pages" title="Workshop Pages" subtitle="Workshop Pages" description="Landing pages for the all-workshops page" />

<main class="relative h-full w-full overflow-y-auto bg-white p-4 dark:bg-gray-800">
	<Breadcrumb class="mb-4">
		<BreadcrumbItem home href="/dashboard">Home</BreadcrumbItem>
		<BreadcrumbItem>All Workshops</BreadcrumbItem>
		<BreadcrumbItem>Workshop Pages</BreadcrumbItem>
	</Breadcrumb>

	<div class="mb-4 flex flex-wrap items-center justify-between gap-4">
		<div>
			<Heading tag="h1" class="text-xl font-semibold sm:text-2xl">Workshop Pages</Heading>
			<p class="text-sm text-gray-500">Each page appears on <a class="text-primary-600 underline" href="{SITE}/all-workshops" target="_blank">octobrain.org/all-workshops</a> once it is <b>Live</b>.</p>
		</div>
		<Button on:click={() => edit()} disabled={!venues.length}>+ New workshop page</Button>
	</div>

	{#if !loading && !venues.length}
		<Alert color="yellow" class="mb-4">Add a venue first: <a class="underline" href="/crud/workshop-venues">All Workshops → Venues</a>.</Alert>
	{/if}
	{#if error}<Alert color="red" class="mb-4">{error}</Alert>{/if}

	<div class="mb-4 flex flex-wrap items-center gap-3">
		<ButtonGroup>
			{#each FILTERS as x}
				<Button color={filter === x.id ? 'primary' : 'light'} on:click={() => { filter = x.id; load(); }}>{x.label}</Button>
			{/each}
		</ButtonGroup>
		<form on:submit|preventDefault={load} class="flex gap-2"><Input bind:value={q} placeholder="Search title or slug" size="sm" /><Button size="sm" type="submit">Search</Button></form>
	</div>

	{#if loading}
		<Spinner />
	{:else}
		<Table hoverable>
			<TableHead>
				<TableHeadCell>Workshop</TableHeadCell>
				<TableHeadCell>Venue</TableHeadCell>
				<TableHeadCell>Starts</TableHeadCell>
				<TableHeadCell>Fee</TableHeadCell>
				<TableHeadCell>Seats</TableHeadCell>
				<TableHeadCell>Approval</TableHeadCell>
				<TableHeadCell />
			</TableHead>
			<TableBody>
				{#each listings as l (l.id)}
					<TableBodyRow>
						<TableBodyCell class="whitespace-normal">
							<div class="font-semibold">{l.title}</div>
							<a class="text-xs text-primary-600 underline" href="{SITE}/workshops/{l.slug}" target="_blank">/workshops/{l.slug}</a>
							<div class="text-xs text-gray-500">
								{l.source === 'club' ? `From club: ${l.workshop?.club?.club_name ?? '—'}` : 'Created by admin'}
							</div>
						</TableBodyCell>
						<TableBodyCell>{l.venue?.shortName}<div class="text-xs text-gray-500">{l.venue?.kind === 'hub' ? 'Hub' : 'School'} · {l.venue?.area}</div></TableBodyCell>
						<TableBodyCell>{fmt(l.startDate)}<div class="text-xs text-gray-500">{l.status}</div></TableBodyCell>
						<TableBodyCell>BDT {l.fee}</TableBodyCell>
						<TableBodyCell>
							<button class="text-primary-600 underline" on:click={() => showRegs(l)}>{l._count?.registrations ?? 0} / {l.seats}</button>
						</TableBodyCell>
						<TableBodyCell class="whitespace-normal">
							<Badge color={APPROVAL_COLOR[l.approvalStatus]}>{APPROVAL_LABEL[l.approvalStatus]}</Badge>
							{#if l.pendingChanges}
								<div class="mt-1 rounded bg-yellow-50 p-2 text-xs text-yellow-800">
									<b>Club asked to change:</b>
									{#each Object.keys(l.pendingChanges) as k}<div>{change(l, k)}</div>{/each}
								</div>
							{/if}
							{#if l.rejectionReason}<div class="mt-1 text-xs text-red-600">Reason: {l.rejectionReason}</div>{/if}
						</TableBodyCell>
						<TableBodyCell class="space-y-1">
							<div class="flex flex-wrap gap-1">
								<Button size="xs" on:click={() => edit(l)}>Edit</Button>
								{#if l.approvalStatus !== 'approved' || l.pendingChanges}
									<Button size="xs" color="green" on:click={() => act(l, 'approve')}>{l.pendingChanges ? 'Approve changes' : 'Approve'}</Button>
									<Button size="xs" color="yellow" on:click={() => act(l, 'reject')}>{l.pendingChanges ? 'Reject changes' : 'Reject'}</Button>
								{/if}
								<Button size="xs" color="red" on:click={() => act(l, 'delete')}>Delete</Button>
							</div>
						</TableBodyCell>
					</TableBodyRow>
				{:else}
					<TableBodyRow><TableBodyCell colspan="7">No workshop pages here.</TableBodyCell></TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	{/if}
</main>

<!-- Create / edit -->
<Modal bind:open title={f.id ? `Edit: ${f.title}` : 'New workshop page'} size="xl" autoclose={false}>
	<form class="space-y-6" on:submit|preventDefault={() => save(false)}>
		{#if f.source === 'club' && f.approvalStatus !== 'approved'}
			<Alert color="yellow">Submitted by a club. Check the content, set the payment details below, then click <b>Save & approve</b>.</Alert>
		{/if}

		<section class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<h3 class="font-bold md:col-span-2">1. Basics</h3>
			<Label class="space-y-1"><span>Title *</span><Input bind:value={f.title} required placeholder="Weekend Robotics" /></Label>
			<Label class="space-y-1">
				<span>Page URL (slug)</span>
				<Input bind:value={f.slug} placeholder="auto from title, e.g. banani-steam-jan-27" />
				<span class="text-xs text-gray-500">octobrain.org/workshops/<b>{f.slug || '…'}</b></span>
			</Label>
			<Label class="space-y-1 md:col-span-2">
				<span>Venue *</span>
				<Select bind:value={f.venueId} required items={venues.map((v) => ({ value: v.id, name: `${v.kind === 'hub' ? 'Hub' : 'School'} · ${v.shortName} (${v.area})${v.isActive ? '' : ' — inactive'}` }))} />
			</Label>
			<Label class="space-y-1"><span>Mode</span><Select bind:value={f.mode} items={[{ value: 'offline', name: 'Offline (at the venue)' }, { value: 'online', name: 'Online' }, { value: 'hybrid', name: 'Hybrid (online + at the venue)' }]} /></Label>
			<Label class="space-y-1"><span>Subject</span><Input bind:value={f.subject} placeholder="Robotics, Math, STEAM…" /></Label>
			<Label class="space-y-1 md:col-span-2"><span>Tagline (one line)</span><Input bind:value={f.tagline} /></Label>
			<Label class="space-y-1 md:col-span-2"><span>Description</span><Textarea rows="3" bind:value={f.description} /></Label>
		</section>

		<section class="grid grid-cols-2 gap-4 md:grid-cols-4">
			<h3 class="col-span-2 font-bold md:col-span-4">2. Who & when</h3>
			<Label class="space-y-1"><span>From class *</span><Input type="number" min="1" max="12" bind:value={f.gradeMin} required /></Label>
			<Label class="space-y-1"><span>To class *</span><Input type="number" min="1" max="12" bind:value={f.gradeMax} required /></Label>
			<Label class="space-y-1"><span>Start date *</span><Input type="date" bind:value={f.startDate} required /></Label>
			<Label class="space-y-1"><span>Registration deadline</span><Input type="date" bind:value={f.deadline} /></Label>
			<div class="col-span-2 space-y-1 md:col-span-4">
				<span class="text-sm font-medium">Class days</span>
				<div class="flex flex-wrap gap-4">{#each DAYS as d}<Checkbox bind:group={f.days} value={d}>{d}</Checkbox>{/each}</div>
			</div>
			<Label class="space-y-1 md:col-span-2"><span>Class time</span><Input bind:value={f.time} placeholder="10:00 AM – 12:00 PM" /></Label>
			<Label class="space-y-1"><span>Number of classes</span><Input type="number" min="1" bind:value={f.classCount} placeholder="8" /></Label>
			<Label class="space-y-1"><span>Hours per class</span><Input type="number" step="0.5" bind:value={f.hoursPerSession} /></Label>
		</section>

		<section class="grid grid-cols-2 gap-4 md:grid-cols-4">
			<h3 class="col-span-2 font-bold md:col-span-4">3. Price, seats, status</h3>
			<Label class="space-y-1"><span>Fee (BDT, total paid at registration) *</span><Input type="number" min="0" bind:value={f.fee} required /></Label>
			<Label class="space-y-1"><span>Fee note (optional)</span><Input bind:value={f.feeNote} placeholder="BDT 1,999/month · 3 months" /></Label>
			<Label class="space-y-1"><span>Seats</span><Input type="number" min="0" bind:value={f.seats} /></Label>
			<Label class="space-y-1">
				<span>Status</span>
				<Select bind:value={f.status} items={[{ value: 'open', name: 'Registration open' }, { value: 'upcoming', name: 'Coming soon (pre-registration)' }, { value: 'closed', name: 'Closed / completed' }]} />
			</Label>
		</section>

		<section class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<h3 class="font-bold md:col-span-2">4. Payment (admin only)</h3>
			<Label class="space-y-1">
				<span>Who collects payment?</span>
				<Select bind:value={f.paymentMode} items={[{ value: 'online', name: 'Octobrain (bKash / bank, parents register online)' }, { value: 'school', name: 'The school collects it' }]} />
			</Label>
			{#if f.paymentMode === 'online'}
				<Label class="space-y-1"><span>bKash number *</span><Input bind:value={f.bkashNumber} placeholder="01XXXXXXXXX" /></Label>
				<Label class="space-y-1"><span>bKash method</span><Select bind:value={f.bkashMethod} items={[{ value: 'Payment', name: 'Payment' }, { value: 'Send Money', name: 'Send Money' }]} /></Label>
				<Label class="space-y-1"><span>Payment reference prefix</span><Input bind:value={f.referencePrefix} placeholder="Banani" /></Label>
			{:else}
				<Label class="space-y-1"><span>Note for parents</span><Input bind:value={f.paymentNote} placeholder="Fees are collected by the school office." /></Label>
			{/if}
		</section>

		<section class="space-y-3">
			<h3 class="font-bold">5. Curriculum (sessions or courses)</h3>
			{#each f.sessions as s, i}
				<div class="grid grid-cols-1 gap-2 rounded-lg border p-3 md:grid-cols-[1fr_2fr_auto]">
					<Input bind:value={s.title} placeholder="Title, e.g. Mechanics (Starter)" />
					<Textarea rows="2" bind:value={s.outcomes} placeholder="What they learn, one per line" />
					<Button size="xs" color="red" on:click={() => (f.sessions = without(f.sessions, i))}>Remove</Button>
				</div>
			{/each}
			<Button size="xs" color="light" on:click={() => (f.sessions = [...f.sessions, { title: '', outcomes: '' }])}>+ Add session / course</Button>
			<Label class="space-y-1"><span>Highlights (one per line)</span><Textarea rows="3" bind:value={f.highlights} placeholder="Hands-on Artec robotics kits" /></Label>
		</section>

		<section class="space-y-3">
			<h3 class="font-bold">6. FAQs (extra, besides the standard ones)</h3>
			{#each f.faqs as a, i}
				<div class="grid grid-cols-1 gap-2 rounded-lg border p-3 md:grid-cols-[1fr_2fr_auto]">
					<Input bind:value={a.q} placeholder="Question" />
					<Textarea rows="2" bind:value={a.a} placeholder="Answer" />
					<Button size="xs" color="red" on:click={() => (f.faqs = without(f.faqs, i))}>Remove</Button>
				</div>
			{/each}
			<Button size="xs" color="light" on:click={() => (f.faqs = [...f.faqs, { q: '', a: '' }])}>+ Add FAQ</Button>
		</section>

		<section class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<h3 class="font-bold md:col-span-3">7. Contact person (optional, defaults to Octobrain Admissions)</h3>
			<Label class="space-y-1"><span>Name</span><Input bind:value={f.contact.name} /></Label>
			<Label class="space-y-1"><span>Role</span><Input bind:value={f.contact.role} placeholder="Workshop coordinator" /></Label>
			<Label class="space-y-1"><span>Phone</span><Input bind:value={f.contact.phone} /></Label>
		</section>

		<section class="space-y-3">
			<h3 class="font-bold">8. Images</h3>
			<div class="flex flex-wrap items-center gap-4">
				{#if f.coverUrl}<img src={f.coverUrl} alt="cover" class="h-20 w-32 rounded object-cover" />{/if}
				<Label class="space-y-1"><span>Cover image</span><input type="file" accept="image/*" on:change={(e) => onUpload(e, 'cover')} /></Label>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				{#each f.gallery as g, i}
					<button type="button" title="Remove" on:click={() => (f.gallery = without(f.gallery, i))}><img src={g} alt="" class="h-16 w-24 rounded object-cover" /></button>
				{/each}
				<Label class="space-y-1"><span>Gallery (click a photo to remove)</span><input type="file" accept="image/*" multiple on:change={(e) => onUpload(e, 'gallery')} /></Label>
			</div>
			{#if uploading}<Spinner size="4" /> Uploading…{/if}
		</section>

		{#if !f.id}
			<Label class="space-y-1">
				<span>Publish</span>
				<Select bind:value={f.approvalStatus} items={[{ value: 'approved', name: 'Live now (show on website)' }, { value: 'draft', name: 'Save as draft (hidden)' }]} />
			</Label>
		{/if}

		{#if formError}<Alert color="red">{formError}</Alert>{/if}
		<div class="flex justify-end gap-2">
			<Button color="alternative" on:click={() => (open = false)}>Cancel</Button>
			{#if f.id && f.approvalStatus !== 'approved'}
				<Button color="green" disabled={saving || uploading} on:click={() => save(true)}>Save & approve</Button>
			{/if}
			<Button type="submit" disabled={saving || uploading}>{saving ? 'Saving…' : 'Save'}</Button>
		</div>
	</form>
</Modal>

<!-- Registrations -->
<Modal bind:open={regOpen} title="Registrations: {regFor?.title ?? ''}" size="xl">
	{#if regLoading}
		<Spinner />
	{:else}
		<Table>
			<TableHead>
				<TableHeadCell>Date</TableHeadCell>
				<TableHeadCell>Student</TableHeadCell>
				<TableHeadCell>Contact</TableHeadCell>
				<TableHeadCell>School / class</TableHeadCell>
				<TableHeadCell>Experience</TableHeadCell>
				<TableHeadCell>Payment</TableHeadCell>
				<TableHeadCell>Verified</TableHeadCell>
			</TableHead>
			<TableBody>
				{#each regs as r (r.id)}
					<TableBodyRow>
						<TableBodyCell>{fmt(r.createdAt)}</TableBodyCell>
						<TableBodyCell>{r.name}</TableBodyCell>
						<TableBodyCell>{r.contact_number}<div class="text-xs text-gray-500">{r.email}</div></TableBodyCell>
						<TableBodyCell class="whitespace-normal">{r.school_name ?? '—'}<div class="text-xs text-gray-500">Class {r.grade ?? '—'}</div></TableBodyCell>
						<TableBodyCell>{EXPERIENCE[r.previous_experience] ?? r.previous_experience ?? '—'}</TableBodyCell>
						<TableBodyCell class="whitespace-normal">BDT {r.final_amount ?? r.amount} · {r.payment_option ?? ''}<div class="font-mono text-xs">{r.transaction_id}</div></TableBodyCell>
						<TableBodyCell><Badge color={r.emailVerified ? 'green' : 'yellow'}>{r.emailVerified ? 'Yes' : 'Not yet'}</Badge></TableBodyCell>
					</TableBodyRow>
				{:else}
					<TableBodyRow><TableBodyCell colspan="7">No registrations yet.</TableBodyCell></TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	{/if}
</Modal>

<!-- Approve / reject / delete confirmation -->
<Modal bind:open={actOpen} size="sm" autoclose={false}
	title={actType === 'delete' ? 'Delete workshop page' : actType === 'reject' ? (actItem?.pendingChanges ? 'Reject requested changes' : 'Reject workshop page') : (actItem?.pendingChanges ? 'Approve requested changes' : 'Approve workshop page')}>
	{#if actItem}
		{#if actType === 'delete'}
			<p>Delete <b>{actItem.title}</b>? It disappears from the website. Its registrations are kept but no longer linked to it.</p>
		{:else if actType === 'reject'}
			<p class="mb-2">
				{actItem.pendingChanges ? 'The page stays live with its current values. ' : ''}Why are you rejecting <b>{actItem.title}</b>? The club owner will see this.
			</p>
			<Textarea rows="3" bind:value={actReason} placeholder="e.g. Please add the class time in the description" />
		{:else}
			<p>
				{actItem.pendingChanges ? 'Apply the club\'s requested changes to' : 'Publish'} <b>{actItem.title}</b> on the all-workshops page?
			</p>
		{/if}
		{#if actError}
			<Alert color="red" class="mt-3">
				{actError}
				{#if actType === 'approve' && /bKash/.test(actError)}
					<div class="mt-1">Click <b>Cancel</b>, then <b>Edit</b> this page, fill <b>4. Payment</b> and use <b>Save &amp; approve</b>.</div>
				{/if}
			</Alert>
		{/if}
		<div class="mt-4 flex justify-end gap-2">
			<Button color="alternative" on:click={() => (actOpen = false)}>Cancel</Button>
			<Button color={actType === 'delete' ? 'red' : actType === 'reject' ? 'yellow' : 'green'} disabled={actBusy} on:click={runAction}>
				{actBusy ? 'Working…' : actType === 'delete' ? 'Delete' : actType === 'reject' ? 'Reject' : 'Approve'}
			</Button>
		</div>
	{/if}
</Modal>
