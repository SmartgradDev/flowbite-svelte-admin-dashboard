<script lang="ts">
	import { onMount } from 'svelte';
	import axios from 'axios';
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Heading,
		Input,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Toolbar,
		Badge,
		Spinner,
		Modal,
		Alert,
		Checkbox,
		Tooltip
	} from 'flowbite-svelte';
	import {
		CheckCircleSolid,
		CloseCircleSolid,
		RefreshOutline,
		UsersGroupSolid
	} from 'flowbite-svelte-icons';
	import MetaTag from '../../../utils/MetaTag.svelte';

	const apiUrl = process.env.VITE_API_URL || 'https://prodbackend.octobrain.org';

	let pendingUsers: any[] = [];
	let loading: boolean = true;
	let errorMessage: string = '';
	let successMessage: string = '';
	let searchFilter: string = '';

	// Selection state
	let selectedIds: string[] = [];

	// Action Modal State
	let selectedUser: any = null;
	let showApproveModal: boolean = false;
	let showRejectModal: boolean = false;
	let showApproveBulkModal: boolean = false;
	let showApproveAllModal: boolean = false;
	let actionLoading: boolean = false;

	const path: string = '/crud/pending-users';
	const description: string = 'Pending User Registration Approvals - Octobrain Admin Dashboard';
	const title: string = 'Octobrain Admin Dashboard - Pending Users';
	const subtitle: string = 'Pending Users';

	function getToken(): string {
		if (typeof document === 'undefined') return '';
		const cookies = document.cookie.split(';');
		for (let i = 0; i < cookies.length; i++) {
			const cookie = cookies[i].trim();
			if (cookie.startsWith('token=')) {
				return cookie.substring('token='.length);
			}
		}
		return sessionStorage.getItem('token') || '';
	}

	function extractErrorMessage(error: any, fallbackMessage: string): string {
		if (!error) return fallbackMessage;
		const status = error?.response?.status;
		const errData = error?.response?.data;
		if (status === 401 || status === 403) {
			const msg = typeof errData?.error === 'object'
				? errData?.error?.message
				: (errData?.error || errData?.message);
			if (msg) return `Session Expired (${msg}). Please refresh or log in again.`;
			return 'Session Expired or Unauthorized (403/401). Please log in again.';
		}
		if (typeof errData?.error === 'string') return errData.error;
		if (typeof errData?.error?.message === 'string') return errData.error.message;
		if (typeof errData?.message === 'string') return errData.message;
		if (typeof error?.message === 'string') return error.message;
		return fallbackMessage;
	}

	const fetchPendingUsers = async () => {
		loading = true;
		errorMessage = '';
		try {
			const token = getToken();
			const response = await axios.get(`${apiUrl}/admin/pendingUsers`, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			if (response.data && Array.isArray(response.data.result)) {
				pendingUsers = response.data.result;
			} else {
				pendingUsers = [];
			}
		} catch (error: any) {
			if (error?.response?.status === 404 || error?.response?.data?.error === 'Not Found') {
				pendingUsers = [];
				errorMessage = '';
			} else {
				console.error('Error fetching pending users:', error);
				errorMessage = extractErrorMessage(error, 'Failed to fetch pending users');
				pendingUsers = [];
			}
		} finally {
			loading = false;
		}
	};

	onMount(() => {
		fetchPendingUsers();
	});

	// Safe Extractors handling null / undefined
	function getUserName(user: any): string {
		if (!user) return 'N/A';
		if (Array.isArray(user.student) && user.student.length > 0 && user.student[0]?.name) {
			return user.student[0].name;
		}
		if (Array.isArray(user.teacher) && user.teacher.length > 0 && user.teacher[0]?.name) {
			return user.teacher[0].name;
		}
		if (Array.isArray(user.parent) && user.parent.length > 0 && user.parent[0]?.name) {
			return user.parent[0].name;
		}
		return user.name || 'N/A';
	}

	function getUserPhone(user: any): string {
		if (!user) return 'N/A';
		if (Array.isArray(user.student) && user.student.length > 0 && user.student[0]?.phone_number) {
			return user.student[0].phone_number;
		}
		if (Array.isArray(user.teacher) && user.teacher.length > 0 && user.teacher[0]?.phone_number) {
			return user.teacher[0].phone_number;
		}
		if (Array.isArray(user.parent) && user.parent.length > 0 && user.parent[0]?.phone_number) {
			return user.parent[0].phone_number;
		}
		return user.phone_number || 'N/A';
	}

	function getUserSchool(user: any): string {
		if (!user) return 'N/A';
		if (Array.isArray(user.student) && user.student.length > 0 && user.student[0]?.schoolId) {
			return user.student[0].schoolId;
		}
		if (Array.isArray(user.teacher) && user.teacher.length > 0 && user.teacher[0]?.schoolId) {
			return user.teacher[0].schoolId;
		}
		return user.schoolId || 'N/A';
	}

	function formatDate(dateStr: string | null | undefined): string {
		if (!dateStr) return 'N/A';
		try {
			return new Date(dateStr).toLocaleString();
		} catch {
			return String(dateStr);
		}
	}

	// Filter pending users safely
	$: filteredUsers = (pendingUsers || []).filter((user: any) => {
		if (!searchFilter.trim()) return true;
		const query = searchFilter.toLowerCase();
		const email = (user?.email || '').toLowerCase();
		const name = getUserName(user).toLowerCase();
		const type = (user?.type || '').toLowerCase();
		const phone = getUserPhone(user).toLowerCase();
		return email.includes(query) || name.includes(query) || type.includes(query) || phone.includes(query);
	});

	// Selection Handlers
	$: isAllSelected = filteredUsers.length > 0 && filteredUsers.every((u: any) => u?.id && selectedIds.includes(u.id));

	function toggleSelectAll() {
		const validFilteredIds = filteredUsers.map((u: any) => u.id).filter(Boolean);
		if (isAllSelected) {
			selectedIds = [];
		} else {
			selectedIds = Array.from(new Set([...selectedIds, ...validFilteredIds]));
		}
	}

	function toggleUserSelection(id: string) {
		if (!id) return;
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter((item) => item !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
	}

	// Single Action Modals
	function openApproveModal(user: any) {
		selectedUser = user;
		showApproveModal = true;
	}

	function openRejectModal(user: any) {
		selectedUser = user;
		showRejectModal = true;
	}

	async function handleApproveUser() {
		if (!selectedUser?.id) return;
		actionLoading = true;
		errorMessage = '';
		successMessage = '';
		try {
			const token = getToken();
			const response = await axios.post(
				`${apiUrl}/admin/approveUser`,
				{ ssoId: selectedUser.id },
				{
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					}
				}
			);
			successMessage = response.data?.message || 'User approved successfully';
			showApproveModal = false;
			selectedUser = null;
			selectedIds = selectedIds.filter((id) => id !== selectedUser?.id);
			await fetchPendingUsers();
		} catch (error: any) {
			console.error('Approve error:', error);
			errorMessage = extractErrorMessage(error, 'Failed to approve user');
		} finally {
			actionLoading = false;
		}
	}

	async function handleRejectUser() {
		if (!selectedUser?.id) return;
		actionLoading = true;
		errorMessage = '';
		successMessage = '';
		try {
			const token = getToken();
			const response = await axios.post(
				`${apiUrl}/admin/rejectUser`,
				{ ssoId: selectedUser.id },
				{
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					}
				}
			);
			successMessage = response.data?.message || 'User registration request rejected';
			showRejectModal = false;
			selectedUser = null;
			selectedIds = selectedIds.filter((id) => id !== selectedUser?.id);
			await fetchPendingUsers();
		} catch (error: any) {
			console.error('Reject error:', error);
			errorMessage = extractErrorMessage(error, 'Failed to reject user');
		} finally {
			actionLoading = false;
		}
	}

	// Bulk Action Handlers
	async function handleApproveBulkUsers() {
		if (selectedIds.length === 0) return;
		actionLoading = true;
		errorMessage = '';
		successMessage = '';
		try {
			const token = getToken();
			const response = await axios.post(
				`${apiUrl}/admin/approveBulkUsers`,
				{ ssoIds: selectedIds },
				{
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					}
				}
			);
			successMessage = response.data?.message || `Successfully approved ${selectedIds.length} selected users`;
			showApproveBulkModal = false;
			selectedIds = [];
			await fetchPendingUsers();
		} catch (error: any) {
			console.error('Bulk approve error:', error);
			errorMessage = extractErrorMessage(error, 'Failed to approve selected users');
		} finally {
			actionLoading = false;
		}
	}

	async function handleApproveAllPendingUsers() {
		actionLoading = true;
		errorMessage = '';
		successMessage = '';
		try {
			const token = getToken();
			const response = await axios.post(
				`${apiUrl}/admin/approveAllUsers`,
				{},
				{
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					}
				}
			);
			successMessage = response.data?.message || 'Successfully approved all pending users';
			showApproveAllModal = false;
			selectedIds = [];
			await fetchPendingUsers();
		} catch (error: any) {
			console.error('Approve all error:', error);
			errorMessage = extractErrorMessage(error, 'Failed to approve all pending users');
		} finally {
			actionLoading = false;
		}
	}
</script>

<MetaTag {path} {description} {title} {subtitle} />

<main class="relative h-full w-full overflow-y-auto bg-white dark:bg-gray-800">
	<div class="p-4">
		<Breadcrumb class="mb-5">
			<BreadcrumbItem home href="/dashboard">Home</BreadcrumbItem>
			<BreadcrumbItem href="/crud/users">Users</BreadcrumbItem>
			<BreadcrumbItem>Pending Users</BreadcrumbItem>
		</Breadcrumb>
		<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
			<Heading tag="h1" class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
				Pending User Approvals ({pendingUsers.length})
			</Heading>
		</div>

		{#if successMessage}
			<Alert color="green" class="mt-4" dismissible on:close={() => (successMessage = '')}>
				<span class="font-medium">Success:</span> {successMessage}
			</Alert>
		{/if}

		{#if errorMessage}
			<Alert color="red" class="mt-4" dismissible on:close={() => (errorMessage = '')}>
				<span class="font-medium">Error:</span> {errorMessage}
			</Alert>
		{/if}

		<Toolbar embedded class="w-full py-4 text-gray-500 dark:text-gray-400">
			<Input placeholder="Search pending users" bind:value={searchFilter} class="me-4 w-72 border xl:w-80" />

			<div slot="end" class="flex flex-wrap items-center gap-2">
				<Button
					size="sm"
					color="green"
					class="gap-1 px-3"
					disabled={selectedIds.length === 0 || loading}
					on:click={() => (showApproveBulkModal = true)}
				>
					<CheckCircleSolid size="sm" /> Approve Selected ({selectedIds.length})
				</Button>

				<Button
					size="sm"
					color="blue"
					class="gap-1 px-3"
					disabled={pendingUsers.length === 0 || loading}
					on:click={() => (showApproveAllModal = true)}
				>
					<CheckCircleSolid size="sm" /> Approve All Pending ({pendingUsers.length})
				</Button>

				<Button size="sm" color="alternative" class="gap-1 px-3" on:click={fetchPendingUsers} disabled={loading}>
					{#if loading}
						<Spinner size="4" />
					{:else}
						<RefreshOutline size="sm" />
					{/if}
					Refresh
				</Button>
			</div>
		</Toolbar>
	</div>

	<Table>
		<TableHead class="border-y border-gray-200 bg-gray-100 dark:border-gray-700">
			<TableHeadCell class="w-4 p-4">
				<Checkbox checked={isAllSelected} on:change={toggleSelectAll} disabled={filteredUsers.length === 0} />
			</TableHeadCell>
			{#each ['Name', 'Email', 'Type', 'Phone', 'School ID', 'Registered Date', 'Status', 'Actions'] as title}
				<TableHeadCell class="p-4 font-medium">{title}</TableHeadCell>
			{/each}
		</TableHead>
		<TableBody>
			{#if loading}
				<TableBodyRow>
					<TableBodyCell colspan={9} class="p-8 text-center text-gray-500 dark:text-gray-400">
						<Spinner size="6" class="mr-2" /> Loading pending users...
					</TableBodyCell>
				</TableBodyRow>
			{:else if filteredUsers.length === 0}
				<TableBodyRow>
					<TableBodyCell colspan={9} class="p-12 text-center text-gray-500 dark:text-gray-400">
						<div class="flex flex-col items-center justify-center space-y-2">
							<UsersGroupSolid class="h-10 w-10 text-gray-400 dark:text-gray-500" />
							<p class="text-base font-medium text-gray-700 dark:text-gray-300">No pending registrations</p>
							<p class="text-sm text-gray-500 dark:text-gray-400">There are currently no user accounts waiting for admin approval.</p>
						</div>
					</TableBodyCell>
				</TableBodyRow>
			{:else}
				{#each filteredUsers as user (user?.id || Math.random())}
					<TableBodyRow class="text-base">
						<TableBodyCell class="w-4 p-4">
							<Checkbox
								checked={selectedIds.includes(user?.id)}
								on:change={() => toggleUserSelection(user?.id)}
							/>
						</TableBodyCell>
						<TableBodyCell class="p-4 font-semibold text-gray-900 dark:text-white">
							{getUserName(user)}
						</TableBodyCell>
						<TableBodyCell class="p-4 text-xs">{user?.email ?? 'N/A'}</TableBodyCell>
						<TableBodyCell class="p-4">
							<Badge color={user?.type === 'student' ? 'blue' : user?.type === 'teacher' ? 'purple' : 'indigo'}>
								{user?.type ? user.type.toUpperCase() : 'N/A'}
							</Badge>
						</TableBodyCell>
						<TableBodyCell class="p-4 text-xs">{getUserPhone(user)}</TableBodyCell>
						<TableBodyCell class="p-4 font-mono text-xs">{getUserSchool(user)}</TableBodyCell>
						<TableBodyCell class="p-4 text-xs">{formatDate(user?.createdAt)}</TableBodyCell>
						<TableBodyCell class="p-4">
							<Badge color="yellow">{user?.approvalStatus ?? 'PENDING'}</Badge>
						</TableBodyCell>
						<TableBodyCell class="p-4">
							<div class="flex items-center space-x-1.5">
								<Button
									size="xs"
									color="green"
									class="p-2"
									on:click={() => openApproveModal(user)}
								>
									<CheckCircleSolid class="h-4 w-4" />
								</Button>
								<Tooltip>Approve User</Tooltip>

								<Button
									size="xs"
									color="red"
									class="p-2"
									on:click={() => openRejectModal(user)}
								>
									<CloseCircleSolid class="h-4 w-4" />
								</Button>
								<Tooltip>Reject Request</Tooltip>
							</div>
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			{/if}
		</TableBody>
	</Table>
</main>

<!-- Single Approve Confirmation Modal -->
<Modal bind:open={showApproveModal} size="xs" title="Approve Registration" autoclose={false}>
	<div class="p-4 text-center">
		<CheckCircleSolid class="mx-auto mb-4 h-12 w-12 text-green-500 dark:text-green-400" />
		<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
			Approve User Registration?
		</h3>
		<p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
			User <span class="font-medium text-gray-900 dark:text-white">{getUserName(selectedUser)}</span> ({selectedUser?.email ?? 'N/A'}) will be granted platform access.
		</p>
		<div class="flex justify-center gap-3">
			<Button color="green" class="px-5 py-2" on:click={handleApproveUser} disabled={actionLoading}>
				{#if actionLoading}
					<Spinner size="4" class="mr-2" /> Approving...
				{:else}
					Yes, Approve
				{/if}
			</Button>
			<Button color="alternative" class="px-5 py-2" on:click={() => (showApproveModal = false)} disabled={actionLoading}>
				Cancel
			</Button>
		</div>
	</div>
</Modal>

<!-- Single Reject Confirmation Modal -->
<Modal bind:open={showRejectModal} size="xs" title="Reject Registration" autoclose={false}>
	<div class="p-4 text-center">
		<CloseCircleSolid class="mx-auto mb-4 h-12 w-12 text-red-500 dark:text-red-400" />
		<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
			Reject Registration Request?
		</h3>
		<p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
			Request for <span class="font-medium text-gray-900 dark:text-white">{getUserName(selectedUser)}</span> ({selectedUser?.email ?? 'N/A'}) will be rejected.
		</p>
		<div class="flex justify-center gap-3">
			<Button color="red" class="px-5 py-2" on:click={handleRejectUser} disabled={actionLoading}>
				{#if actionLoading}
					<Spinner size="4" class="mr-2" /> Rejecting...
				{:else}
					Yes, Reject
				{/if}
			</Button>
			<Button color="alternative" class="px-5 py-2" on:click={() => (showRejectModal = false)} disabled={actionLoading}>
				Cancel
			</Button>
		</div>
	</div>
</Modal>

<!-- Bulk Approve Selected Modal -->
<Modal bind:open={showApproveBulkModal} size="xs" title="Approve Selected Users" autoclose={false}>
	<div class="p-4 text-center">
		<CheckCircleSolid class="mx-auto mb-4 h-12 w-12 text-green-500 dark:text-green-400" />
		<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
			Approve {selectedIds.length} Selected Users?
		</h3>
		<p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
			Are you sure you want to approve all <span class="font-medium text-gray-900 dark:text-white">{selectedIds.length}</span> checked user accounts at once?
		</p>
		<div class="flex justify-center gap-3">
			<Button color="green" class="px-5 py-2" on:click={handleApproveBulkUsers} disabled={actionLoading}>
				{#if actionLoading}
					<Spinner size="4" class="mr-2" /> Approving...
				{:else}
					Yes, Approve Selected
				{/if}
			</Button>
			<Button color="alternative" class="px-5 py-2" on:click={() => (showApproveBulkModal = false)} disabled={actionLoading}>
				Cancel
			</Button>
		</div>
	</div>
</Modal>

<!-- Approve All Pending Users Modal -->
<Modal bind:open={showApproveAllModal} size="xs" title="Approve All Pending Users" autoclose={false}>
	<div class="p-4 text-center">
		<CheckCircleSolid class="mx-auto mb-4 h-12 w-12 text-blue-500 dark:text-blue-400" />
		<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
			Approve All {pendingUsers.length} Pending Users?
		</h3>
		<p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
			This will approve every pending user account (<span class="font-medium text-gray-900 dark:text-white">{pendingUsers.length} total</span>) in one click.
		</p>
		<div class="flex justify-center gap-3">
			<Button color="blue" class="px-5 py-2" on:click={handleApproveAllPendingUsers} disabled={actionLoading}>
				{#if actionLoading}
					<Spinner size="4" class="mr-2" /> Approving All...
				{:else}
					Yes, Approve All
				{/if}
			</Button>
			<Button color="alternative" class="px-5 py-2" on:click={() => (showApproveAllModal = false)} disabled={actionLoading}>
				Cancel
			</Button>
		</div>
	</div>
</Modal>
