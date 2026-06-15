<script lang="ts">
	import thickbarsBase from '$lib/graphs/thickbars';
	import thickbarsTeacherBase from '$lib/graphs/thickbars_teachers';
	import thinfillbarsBase from '$lib/graphs/thinfillbars';
	import thinmultibarsBase from '$lib/graphs/thinmultibars';
	import ChartWidget from '$lib/widgets/ChartWidget.svelte';
	import { Card, Chart } from 'flowbite-svelte';
	import type { PageData } from '../../routes/(sidebar)/$types';
	import Stats from './Stats.svelte';

	import { onMount } from 'svelte';
	import ActivityList from './ActivityList.svelte';
	import Change from './Change.svelte';
	import DesktopPc from './DesktopPc.svelte';
	import Insights from './Insights.svelte';
	import Traffic from './Traffic.svelte';
	import Transactions from './Transactions.svelte';
	import chart_options_func from '../../routes/(sidebar)/dashboard/chart_options';

	export let data: PageData;

	let chartOptions = chart_options_func(false);
	chartOptions.series = data.series;

	let dark = false;
	
	// Student Weekly Stats
	let studentCount = 0;
	let percentageGain = 0;
	
	// Teacher Weekly Stats
	let teacherCount = 0;
	let percentageGainTeacher = 0;

	// Total / Monthly Stats
	let totalStudentCount = 0;
	let currentMonthStudentCount = 0;
	let percentageGainStudentMonth = 0;

	let totalTeacherCount = 0;
	let currentMonthTeacherCount = 0;
	let percentageGainTeacherMonth = 0;

	let totalClubCount = 0;
	let currentMonthClubCount = 0;
	let percentageGainClubMonth = 0;

	let totalWorkshopCount = 0;
	let currentMonthWorkshopCount = 0;
	let percentageGainWorkshopMonth = 0;

	// Engagement variables
	let postCount = 0;
	let percentageGainPost = 0;
	let commentCount = 0;
	let percentageGainComment = 0;
	let reactionCount = 0;
	let percentageGainReaction = 0;

	// Selected dashboard period range
	let timeslot = 'Last 7 days';

	// Graph configs copy for reactive updates
	let thickbars = {
		...thickbarsBase,
		series: [{ name: 'New students', color: '#EF562F', data: [] }]
	};
	let thickbars_teacher = {
		...thickbarsTeacherBase,
		series: [{ name: 'New teachers', color: '#EF562F', data: [] }]
	};
	let thinfillbarsStudents = {
		...thinfillbarsBase,
		series: [{ name: 'Students', data: [] }]
	};
	let thinfillbarsTeachers = {
		...thinfillbarsBase,
		series: [{ name: 'Teachers', data: [] }]
	};
	let thinfillbarsClubs = {
		...thinfillbarsBase,
		plotOptions: {
			...thinfillbarsBase.plotOptions,
			bar: { ...thinfillbarsBase.plotOptions?.bar, horizontal: true }
		},
		series: [{ name: 'Clubs', data: [] }]
	};
	let thinfillbarsWorkshops = {
		...thinfillbarsBase,
		plotOptions: {
			...thinfillbarsBase.plotOptions,
			bar: { ...thinfillbarsBase.plotOptions?.bar, horizontal: true }
		},
		series: [{ name: 'Workshops', data: [] }]
	};
	let thinmultibarsOptions = {
		...thinmultibarsBase,
		colors: ['#EF562F', '#FDBA8C', '#17B0BD'],
		series: [
			{ name: 'Clubs', color: '#EF562F', data: [] },
			{ name: 'Workshops', color: '#FDBA8C', data: [] },
			{ name: 'Events', color: '#17B0BD', data: [] }
		]
	};

	let thickbarsPost = {
		...thickbarsBase,
		series: [{ name: 'Posts', color: '#1A56DB', data: [] }]
	};
	let thickbarsComment = {
		...thickbarsBase,
		series: [{ name: 'Comments', color: '#16BDCA', data: [] }]
	};
	let thickbarsReaction = {
		...thickbarsBase,
		series: [{ name: 'Reactions', color: '#FDBA8C', data: [] }]
	};

	// Reactive statement to apply dark/light theme mode on all charts reactively
	$: {
		const mode = dark ? 'dark' : 'light';
		
		thickbars.theme = { mode };
		thickbars_teacher.theme = { mode };
		thinfillbarsStudents.theme = { mode };
		thinfillbarsTeachers.theme = { mode };
		thinfillbarsClubs.theme = { mode };
		thinfillbarsWorkshops.theme = { mode };
		thinmultibarsOptions.theme = { mode };
		thickbarsPost.theme = { mode };
		thickbarsComment.theme = { mode };
		thickbarsReaction.theme = { mode };

		thickbars = { ...thickbars };
		thickbars_teacher = { ...thickbars_teacher };
		thinfillbarsStudents = { ...thinfillbarsStudents };
		thinfillbarsTeachers = { ...thinfillbarsTeachers };
		thinfillbarsClubs = { ...thinfillbarsClubs };
		thinfillbarsWorkshops = { ...thinfillbarsWorkshops };
		thinmultibarsOptions = { ...thinmultibarsOptions };
		thickbarsPost = { ...thickbarsPost };
		thickbarsComment = { ...thickbarsComment };
		thickbarsReaction = { ...thickbarsReaction };
	}

	// Helper map to convert timeslot name to number of days
	const timeslotDays: Record<string, number> = {
		Today: 1,
		'Last 3 days': 3,
		'Last 7 days': 7,
		'Last 30 days': 30,
		'Last 90 days': 90
	};

	// Function to parse the days from the timeslot label (handles custom labels too)
	function getDaysFromTimeslot(slot: string): number {
		if (timeslotDays[slot] !== undefined) return timeslotDays[slot];
		const match = slot.match(/Custom \((\d+) days\)/);
		if (match) {
			return parseInt(match[1], 10);
		}
		return 7; // Default fallback
	}

	let mounted = false;

	// Reactive statement to fetch new statistics and charts when timeslot changes
	$: {
		if (mounted && timeslot) {
			const days = getDaysFromTimeslot(timeslot);
			loadAllDashboardData(days);
		}
	}

	function handler(ev: Event) {
		if ('detail' in ev) {
			dark = !!ev.detail;
			// Recreate options keeping current series/categories
			const savedSeries = chartOptions.series;
			const savedCategories = chartOptions.xaxis?.categories;
			
			chartOptions = chart_options_func(dark);
			chartOptions.series = savedSeries;
			if (chartOptions.xaxis) {
				chartOptions.xaxis.categories = savedCategories;
			}
			chartOptions = { ...chartOptions };
		}
	}

	async function loadAllDashboardData(days: number) {
		const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';

		// Fetch main comparison chart series
		try {
			const response = await fetch(API_URL + `/admin/weeklyStudentComparison?days=${days}`);
			const json = await response.json();
			const { currentPeriod, previousPeriod } = json.result;

			const currentData = currentPeriod.map(item => item.y);
			const previousData = previousPeriod.map(item => item.y);
			const categories = currentPeriod.map(item => item.x);

			chartOptions.series = [
				{
					name: 'Students',
					data: currentData,
					color: '#EF562F'
				},
				{
					name: 'Students (previous period)',
					data: previousData,
					color: '#FDBA8C'
				}
			];
			if (chartOptions.xaxis) {
				chartOptions.xaxis.categories = categories;
			}

			chartOptions = { ...chartOptions };
		} catch (error) {
			console.error('Failed to fetch comparison data:', error);
		}

		// Fetch general overview statistics
		try {
			const response = await fetch(API_URL + `/admin/dashboardStats?days=${days}`);
			const json = await response.json();
			const stats = json.result;

			// Update student stats
			studentCount = stats.students.newThisWeek;
			percentageGain = stats.students.percentageGainWeek;
			totalStudentCount = stats.students.total;
			currentMonthStudentCount = stats.students.newThisMonth;
			percentageGainStudentMonth = stats.students.percentageGainMonth;

			// Update teacher stats
			teacherCount = stats.teachers.newThisWeek;
			percentageGainTeacher = stats.teachers.percentageGainWeek;
			totalTeacherCount = stats.teachers.total;
			currentMonthTeacherCount = stats.teachers.newThisMonth;
			percentageGainTeacherMonth = stats.teachers.percentageGainMonth;

			// Update club stats
			totalClubCount = stats.clubs.total;
			currentMonthClubCount = stats.clubs.newThisMonth;
			percentageGainClubMonth = stats.clubs.percentageGainMonth;

			// Update workshop stats
			totalWorkshopCount = stats.workshops.total;
			currentMonthWorkshopCount = stats.workshops.newThisMonth;
			percentageGainWorkshopMonth = stats.workshops.percentageGainMonth;

			// Update engagement stats
			postCount = stats.posts.newThisWeek;
			percentageGainPost = stats.posts.percentageGainWeek;
			commentCount = stats.comments.newThisWeek;
			percentageGainComment = stats.comments.percentageGainWeek;
			reactionCount = stats.reactions.newThisWeek;
			percentageGainReaction = stats.reactions.percentageGainWeek;
		} catch (error) {
			console.error('Failed to fetch dashboard stats:', error);
		}

		// Fetch weekly student daily graph data
		try {
			const response = await fetch(API_URL + `/admin/dailyGain?model=student&days=${days}`);
			const json = await response.json();
			thickbars.series[0].data = json.result.map(item => item.y);
			thickbars = { ...thickbars };
		} catch (error) {
			console.error('Failed to fetch weekly student gain graph:', error);
		}

		// Fetch weekly teacher daily graph data
		try {
			const response = await fetch(API_URL + `/admin/dailyGain?model=teacher&days=${days}`);
			const json = await response.json();
			thickbars_teacher.series[0].data = json.result.map(item => item.y);
			thickbars_teacher = { ...thickbars_teacher };
		} catch (error) {
			console.error('Failed to fetch weekly teacher gain graph:', error);
		}

		// Fetch daily post gain graph data
		try {
			const response = await fetch(API_URL + `/admin/dailyGain?model=post&days=${days}`);
			const json = await response.json();
			thickbarsPost.series[0].data = json.result.map(item => item.y);
			thickbarsPost = { ...thickbarsPost };
		} catch (error) {
			console.error('Failed to fetch daily post gain graph:', error);
		}

		// Fetch daily comment gain graph data
		try {
			const response = await fetch(API_URL + `/admin/dailyGain?model=comment&days=${days}`);
			const json = await response.json();
			thickbarsComment.series[0].data = json.result.map(item => item.y);
			thickbarsComment = { ...thickbarsComment };
		} catch (error) {
			console.error('Failed to fetch daily comment gain graph:', error);
		}

		// Fetch daily reaction gain graph data
		try {
			const response = await fetch(API_URL + `/admin/dailyGain?model=reaction&days=${days}`);
			const json = await response.json();
			thickbarsReaction.series[0].data = json.result.map(item => item.y);
			thickbarsReaction = { ...thickbarsReaction };
		} catch (error) {
			console.error('Failed to fetch daily reaction gain graph:', error);
		}

		// Fetch monthly student daily graph data (fixed 30 days)
		try {
			const response = await fetch(API_URL + '/admin/dailyGain?model=student&days=30');
			const json = await response.json();
			thinfillbarsStudents.series[0].data = json.result.map(item => item.y);
			thinfillbarsStudents = { ...thinfillbarsStudents };
		} catch (error) {
			console.error('Failed to fetch monthly student gain graph:', error);
		}

		// Fetch monthly teacher daily graph data
		try {
			const response = await fetch(API_URL + '/admin/dailyGain?model=teacher&days=30');
			const json = await response.json();
			thinfillbarsTeachers.series[0].data = json.result.map(item => item.y);
			thinfillbarsTeachers = { ...thinfillbarsTeachers };
		} catch (error) {
			console.error('Failed to fetch monthly teacher gain graph:', error);
		}

		// Fetch monthly club daily graph data
		try {
			const response = await fetch(API_URL + '/admin/dailyGain?model=club&days=30');
			const json = await response.json();
			thinfillbarsClubs.series[0].data = json.result.map(item => item.y);
			thinfillbarsClubs = { ...thinfillbarsClubs };
		} catch (error) {
			console.error('Failed to fetch monthly club gain graph:', error);
		}

		// Fetch monthly workshop daily graph data
		try {
			const response = await fetch(API_URL + '/admin/dailyGain?model=workshop&days=30');
			const json = await response.json();
			thinfillbarsWorkshops.series[0].data = json.result.map(item => item.y);
			thinfillbarsWorkshops = { ...thinfillbarsWorkshops };
		} catch (error) {
			console.error('Failed to fetch monthly workshop gain graph:', error);
		}

		// Fetch Club, Workshop, and Event growth comparison
		try {
			const [clubsRes, workshopsRes, eventsRes] = await Promise.all([
				fetch(API_URL + `/admin/dailyGain?model=club&days=${days}`),
				fetch(API_URL + `/admin/dailyGain?model=workshop&days=${days}`),
				fetch(API_URL + `/admin/dailyGain?model=event&days=${days}`)
			]);
			
			const [clubsJson, workshopsJson, eventsJson] = await Promise.all([
				clubsRes.json(),
				workshopsRes.json(),
				eventsRes.json()
			]);

			thinmultibarsOptions.series[0].data = clubsJson.result.map(item => item.y);
			thinmultibarsOptions.series[1].data = workshopsJson.result.map(item => item.y);
			thinmultibarsOptions.series[2].data = eventsJson.result.map(item => item.y);
			
			if (thinmultibarsOptions.xaxis) {
				thinmultibarsOptions.xaxis.categories = clubsJson.result.map(item => item.x);
			}

			thinmultibarsOptions = { ...thinmultibarsOptions };
		} catch (error) {
			console.error('Failed to fetch growth comparison stats:', error);
		}
	}

	onMount(() => {
		mounted = true;
		document.addEventListener('dark', handler);
		return () => document.removeEventListener('dark', handler);
	});
</script>

<div class="mt-px space-y-4">
	<div class="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
		<ChartWidget bind:timeslot={timeslot} {chartOptions} title="{totalStudentCount} Students" subtitle="Total Number of Students" />
		<Traffic {dark} />
		<!-- <Stats /> -->
	</div>
	<div class="grid grid-cols-2 gap-4">
		<div class="grid grid-cols-1 grid-rows-3 gap-4 xl:grid-cols-2 xl:grid-rows-3 2xl:grid-cols-2 2xl:grid-rows-3">
			<Card horizontal class="items-center justify-between" size="xl">
				<div class="w-full">
					<p>New students</p>
					<p class="text-2xl font-bold leading-none text-gray-900 dark:text-white sm:text-3xl">
						{studentCount}
					</p>
					<Change size="sm" value={percentageGain} since="Since {timeslot}" />
				</div>
				<Chart options={thickbars} class="w-full" />
			</Card>
			<Card horizontal class="items-center justify-between" size="xl">
				<div class="w-full">
					<p>New teachers</p>
					<p class="text-2xl font-bold leading-none text-gray-900 dark:text-white sm:text-3xl">
						{teacherCount}
					</p>
					<Change size="sm" value={percentageGainTeacher} since="Since {timeslot}" />
				</div>
				<Chart options={thickbars_teacher} class="w-full" />
			</Card>

			<Card horizontal class="items-center justify-between" size="xl">
				<div class="w-full">
					<p>New Students</p>
					<p class="text-2xl font-bold leading-none text-gray-900 dark:text-white sm:text-3xl">
						{currentMonthStudentCount}
					</p>
					<Change size="sm" value={percentageGainStudentMonth} since="Since last month" />
				</div>
				<Chart options={thinfillbarsStudents} class="w-full" />
			</Card>
			<Card horizontal class="items-center justify-between" size="xl">
				<div class="w-full">
					<p>New Teachers</p>
					<p class="text-2xl font-bold leading-none text-gray-900 dark:text-white sm:text-3xl">
						{currentMonthTeacherCount}
					</p>
					<Change size="sm" value={percentageGainTeacherMonth} since="Since last month" />
				</div>
				<Chart options={thinfillbarsTeachers} class="w-full" />
			</Card>
			<Card horizontal class="items-center justify-between" size="xl">
				<div class="w-full">
					<p>New Clubs</p>
					<p class="text-2xl font-bold leading-none text-gray-900 dark:text-white sm:text-3xl">
						{currentMonthClubCount}
					</p>
					<Change size="sm" value={percentageGainClubMonth} since="Since last month" class="w-full" />
				</div>
				<Chart options={thinfillbarsClubs} class="w-full" />
			</Card>
			<Card horizontal class="items-center justify-between" size="xl">
				<div class="w-full">
					<p>New Workshop</p>
					<p class="text-2xl font-bold leading-none text-gray-900 dark:text-white sm:text-3xl">
						{currentMonthWorkshopCount}
					</p>
					<Change size="sm" value={percentageGainWorkshopMonth} since="Since last month" class="w-full" />
				</div>
				<Chart options={thinfillbarsWorkshops} class="w-full" />
			</Card>
		</div>
		<DesktopPc bind:timeslot={timeslot} options={thinmultibarsOptions} />
	</div>
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<Card horizontal class="items-center justify-between" size="xl">
			<div class="w-full">
				<p>Posts Made</p>
				<p class="text-2xl font-bold leading-none text-gray-900 dark:text-white sm:text-3xl">
					{postCount}
				</p>
				<Change size="sm" value={percentageGainPost} since="Since {timeslot}" />
			</div>
			<Chart options={thickbarsPost} class="w-full" />
		</Card>
		<Card horizontal class="items-center justify-between" size="xl">
			<div class="w-full">
				<p>Comments</p>
				<p class="text-2xl font-bold leading-none text-gray-900 dark:text-white sm:text-3xl">
					{commentCount}
				</p>
				<Change size="sm" value={percentageGainComment} since="Since {timeslot}" />
			</div>
			<Chart options={thickbarsComment} class="w-full" />
		</Card>
		<Card horizontal class="items-center justify-between" size="xl">
			<div class="w-full">
				<p>Likes / Reactions</p>
				<p class="text-2xl font-bold leading-none text-gray-900 dark:text-white sm:text-3xl">
					{reactionCount}
				</p>
				<Change size="sm" value={percentageGainReaction} since="Since {timeslot}" />
			</div>
			<Chart options={thickbarsReaction} class="w-full" />
		</Card>
	</div>
</div>
