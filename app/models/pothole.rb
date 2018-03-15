require 'concerns/TimeParser'

class Pothole < ApplicationRecord
  include ::TimeParser

  acts_as_mappable lat_column_name: :latitude,
                   lng_column_name: :longitude

  def self.excluding_unfixed exclude
    if exclude
    then self.where.not(fixed_at: nil)
    else self.all
    end
  end

  def self.excluding_fixed exclude
    if exclude
    then self.where(fixed_at: nil)
    else self.all
    end
  end

  def self.markers_in_bounds bounds
    self
      .in_bounds(bounds)
      .map do |pothole|
        {
          'id':         pothole.id,
          'lat':        pothole.latitude,
          'lng':        pothole.longitude,
          'category':   pothole.category,
          'createdAt':  pothole.created_at.to_f,
          'fixedAt':    pothole.fixed_at.to_f,
          'alertLevel': pothole.alert_level,
          'fixed':      !pothole.fixed_at.nil?
        }
      end
  end

  def time_unfixed
    end_time = fixed_at || Time.now
    end_time - created_at
  end

  def alert_level
    unfixed = time_unfixed

    case
    when unfixed > parse_time(Settings.alert_levels[4])
      4
    when unfixed > parse_time(Settings.alert_levels[3])
      3
    when unfixed > parse_time(Settings.alert_levels[2])
      2
    else
      1
    end
  end
end
