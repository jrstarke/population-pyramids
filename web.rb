require 'sinatra'
require_relative 'data/DataLoader.rb'
require 'json'

set :public, 'public'
set :public_folder, 'public'

get '/' do
  send_file('public/index.html')
end

get '/regions' do
  attribs = DataLoader.buildDictionary()
  
  output = []
  regions = attribs['geo']
  regions.each_key do |key| 
    name = regions[key]
    output = output + [{:name => name, :id => key}]
  end
  
  JSON.dump(output)  
end

get '/region/:region_id' do
  @region_id = params[:region_id]
  puts @region_id
  erb :population_pyramid
  #send_file('public/population_pyramid.html')
end

get '/region/:region_id/data.json' do
  region_id = params[:region_id]
  
  regions = DataLoader.loadData()
  
  region = regions[region_id]
  JSON.dump(region)
end
