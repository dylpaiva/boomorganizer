'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Menu, Smartphone, Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { SidebarBrand, SidebarNav } from './sidebar-nav'

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <SidebarBrand />
        <ScrollArea className="flex-1">
          <SidebarNav />
        </ScrollArea>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" />
              }
            >
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarBrand />
              <ScrollArea className="h-[calc(100vh-4rem)]">
                <SidebarNav onNavigate={() => setOpen(false)} />
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <div className="hidden max-w-md flex-1 md:block">
            <InputGroup>
              <InputGroupAddon>
                <Search className="size-4 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput placeholder="Search lots, magazines, shows…" aria-label="Search" />
            </InputGroup>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="sm" render={<Link href="/m" />}>
              <Smartphone data-icon="inline-start" />
              Mobile
            </Button>
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell />
            </Button>
            <Avatar className="size-8">
              <AvatarFallback className="bg-secondary text-xs font-medium">DC</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
