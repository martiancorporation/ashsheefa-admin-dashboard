import * as React from "react"
import { TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export const description = "An area chart with gradient fill"

// Default chart data with all 12 months
const defaultChartData = [
    { month: "January", visitors: 0 },
    { month: "February", visitors: 0 },
    { month: "March", visitors: 0 },
    { month: "April", visitors: 0 },
    { month: "May", visitors: 0 },
    { month: "June", visitors: 0 },
    { month: "July", visitors: 0 },
    { month: "August", visitors: 0 },
    { month: "September", visitors: 0 },
    { month: "October", visitors: 0 },
    { month: "November", visitors: 0 },
    { month: "December", visitors: 0 },
]

const chartConfig = {
    visitors: {
        label: "Visitors",
        color: "#25CD25",
    },
}

export function VisitorAreaChart({ allDashboardData }) {
    const [isLoading, setIsLoading] = React.useState(true)

    // Retrieve yearly and monthly values from prop
    const yearly = allDashboardData?.yearly || {}
    const availableYears = React.useMemo(() => {
        const years = []
        for (let y = 2025; y <= 2045; y++) {
            years.push(y.toString())
        }
        return years.reverse()
    }, [])

    const [selectedYear, setSelectedYear] = React.useState(() => new Date().getFullYear().toString())

    // Transform API data to match the expected format
    const chartData = React.useMemo(() => {
        let rawData = []
        if (selectedYear && yearly[selectedYear]?.monthly) {
            rawData = yearly[selectedYear].monthly
        } else if (allDashboardData?.chartData?.length) {
            rawData = allDashboardData.chartData
        } else {
            return defaultChartData
        }

        // Create a map of month names to visitors
        const monthMap = {
            'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
            'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
            'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
        }

        // Start with default data (all months with 0 visitors)
        const fullYearData = defaultChartData.map(m => ({ ...m }))

        // Update with actual data from API
        rawData.forEach(item => {
            const fullMonthName = monthMap[item.month] || item.month
            const monthIndex = fullYearData.findIndex(month => month.month === fullMonthName)
            if (monthIndex !== -1) {
                fullYearData[monthIndex].visitors = item.visitors || item.count || 0
            }
        })

        return fullYearData
    }, [allDashboardData?.chartData, yearly, selectedYear])

    React.useEffect(() => {
        if (allDashboardData) {
            setIsLoading(false)
        }
    }, [allDashboardData])

    return (
        <Card className="shadow-none py-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle>Visitor Overview</CardTitle>
                    <CardDescription>
                        Showing total visitors for the last 12 months
                    </CardDescription>
                </div>
                {availableYears.length > 0 && (
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[100px] h-9">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                            {availableYears.map(year => (
                                <SelectItem key={year} value={year}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-[250px]">
                        <div className="flex flex-col items-center space-y-3">
                            <div className="w-8 h-8 border-2 border-green-200 rounded-full animate-spin border-t-green-600"></div>
                            <p className="text-sm text-gray-500">Loading visitor data...</p>
                        </div>
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full shadow-none">
                        <AreaChart
                            accessibilityLayer
                            data={chartData}
                            margin={{
                                left: 12,
                                right: 12,
                            }}
                        >
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="month"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(value) => value.slice(0, 3)}
                            />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                            <defs>
                                <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                                    <stop
                                        offset="5%"
                                        stopColor="var(--color-visitors)"
                                        stopOpacity={0.8}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="var(--color-visitors)"
                                        stopOpacity={0.1}
                                    />
                                </linearGradient>
                            </defs>
                            <Area
                                dataKey="visitors"
                                type="natural"
                                fill="url(#fillVisitors)"
                                fillOpacity={0.4}
                                stroke="var(--color-visitors)"
                            />
                        </AreaChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}
