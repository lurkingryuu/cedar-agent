"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Shield,
  Database,
  FileText,
  CheckCircle,
  Settings,
  LayoutDashboard,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

const navItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Policies",
    url: "/policies",
    icon: Shield,
  },
  {
    title: "Entities",
    url: "/entities",
    icon: Database,
  },
  {
    title: "Schema",
    url: "/schema",
    icon: FileText,
  },
  {
    title: "Authorization",
    url: "/authorization",
    icon: CheckCircle,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <Shield className="h-6 w-6" />
          <div className="flex flex-col">
            <span className="text-lg font-semibold">Cedar Agent</span>
            <span className="text-xs text-muted-foreground">Admin Dashboard</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-sm text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

